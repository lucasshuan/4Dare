import "server-only";
import { isExpired, createRoom as newRoomState, reduce } from "@/game/engine";
import { presenceDue } from "@/game/helpers";
import { matchRecord } from "@/game/record";
import {
  type Character,
  GameError,
  type GameEvent,
  type Identity,
  type Lang,
  type Phase,
  type PlayerId,
  type RoomSettings,
  type RoomState,
  THEME_IDEAS,
  THEME_OPTIONS,
  type Theme,
} from "@/game/types";
import { toPublicRoom } from "@/game/view";
import { getBackend } from "./backend";
import { background } from "./background";
import type { CurrentMatch } from "./contract";

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/;

export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

const ctx = () => ({ now: Date.now(), random: Math.random });

export async function openRoom(host: Identity, settings: RoomSettings) {
  const { rooms, notify } = getBackend();
  for (let attempt = 0; attempt < 10; attempt++) {
    const state = newRoomState(randomCode(), host, settings, ctx());
    if (await rooms.create(state)) {
      background(notify.lobbyChanged);
      return state.code;
    }
  }
  throw new GameError("unknown");
}

/** True when the room list would show this room differently (readiness and presence don't show there). */
function listingChanged(before: RoomState, after: RoomState) {
  const now = Date.now();
  return (
    JSON.stringify(toPublicRoom(before, now)) !==
    JSON.stringify(toPublicRoom(after, now))
  );
}

/**
 * Applies one event with optimistic concurrency: load, reduce, compare-and-swap,
 * and on a lost race start over from the newer state.
 */
export async function dispatch(
  code: string,
  build: (state: RoomState) => GameEvent | Promise<GameEvent>,
): Promise<{ state: RoomState; version: number }> {
  const { rooms, notify } = getBackend();
  for (let attempt = 0; attempt < 5; attempt++) {
    const stored = await rooms.get(code);
    if (!stored) throw new GameError("not_found");
    const event = await build(stored.state);
    const next = reduce(stored.state, event, ctx());
    if (await rooms.compareAndSwap(code, stored.version, next)) {
      background(() => notify.roomChanged(code, stored.version + 1));
      // Only the write that finished the match gets here, so it is saved once.
      if (next.phase === "finished" && stored.state.phase !== "finished") {
        saveMatch(next);
      }
      if (listingChanged(stored.state, next)) background(notify.lobbyChanged);
      return { state: next, version: stored.version + 1 };
    }
  }
  throw new GameError("conflict");
}

/**
 * What a new round needs: ideas for a host who types the theme, or themes to
 * vote on from the room's sets. `quick` skips the AI (a round the clock starts).
 */
export async function roundThemes(
  state: RoomState,
  avoid: Theme[],
  quick = false,
): Promise<Theme[]> {
  const { themes } = getBackend();
  const { themeMode, themeSets } = state.settings;
  if (themeMode === "host") return themes.drawFromBank(THEME_IDEAS);
  return quick
    ? themes.drawFromBank(THEME_OPTIONS, themeSets)
    : themes.draw(avoid, THEME_OPTIONS, themeSets);
}

/** Saves the finished match after the response is sent, so nobody waits for it. */
function saveMatch(state: RoomState) {
  const record = matchRecord(state, Date.now());
  if (!record) return;
  background(() => getBackend().matches.record(record));
}

// Used when the library cannot supply enough characters for a clock-filled pick.
const EMERGENCY: Record<Lang, string[]> = {
  en: [
    "Mickey Mouse",
    "Super Mario",
    "Pikachu",
    "Batman",
    "Harry Potter",
    "Darth Vader",
  ],
  pt: [
    "Mickey Mouse",
    "Super Mario",
    "Pikachu",
    "Batman",
    "Harry Potter",
    "Darth Vader",
  ],
  ja: [
    "ミッキーマウス",
    "マリオ",
    "ピカチュウ",
    "バットマン",
    "ハリー・ポッター",
    "ダース・ベイダー",
  ],
};

async function fallbackCharacters(state: RoomState): Promise<Character[]> {
  const { characters } = getBackend();
  const owed = Object.values(state.assignments).filter((a) => !a.character);
  const out: Character[] = [];
  for (const a of owed) {
    const picker = state.players.find((p) => p.id === a.pickerId);
    const lang: Lang = picker?.lang ?? "en";
    const found = await characters.randomPopular(lang, 4);
    out.push(...found);
    out.push(
      ...EMERGENCY[lang].map((name, i) => ({
        id: `emergency-${lang}-${i}`,
        lang,
        name,
        origin: null,
        imageUrl: null,
        aliases: [],
      })),
    );
  }
  return [...new Map(out.map((c) => [c.id, c])).values()];
}

/** Fires the clock timeouts that are due and returns the room as it is now (one read when nothing is due). Losing a race to another reader is fine. */
export async function applyDueTimeouts(code: string) {
  const { rooms, themes } = getBackend();
  let stored = await rooms.get(code);
  // Closed pages first: a freed seat or a room nobody is left in.
  if (stored && presenceDue(stored.state, Date.now())) {
    try {
      stored = await dispatch(code, () => ({ type: "SWEEP" }));
    } catch (e) {
      if (!(e instanceof GameError)) throw e;
      stored = await rooms.get(code);
    }
  }
  for (let i = 0; i < 4; i++) {
    if (!stored || !isExpired(stored.state, Date.now())) return stored;
    try {
      stored = await dispatch(code, async (state) => {
        if (!isExpired(state, Date.now())) throw new GameError("wrong_phase");
        if (state.phase === "lobby") {
          return {
            type: "TIMEOUT",
            themes: await roundThemes(state, [], true),
          };
        }
        if (state.phase === "theming") {
          // The host never typed it: everyone votes, on themes from every set.
          return {
            type: "TIMEOUT",
            themes: themes.drawFromBank(THEME_OPTIONS),
          };
        }
        if (state.phase === "picking") {
          return {
            type: "TIMEOUT",
            fallbackCharacters: await fallbackCharacters(state),
          };
        }
        return { type: "TIMEOUT" };
      });
    } catch (e) {
      if (e instanceof GameError && e.code === "wrong_phase")
        return rooms.get(code);
      throw e;
    }
  }
  return stored;
}

/** From the theme to the last guess: a player in one of these can't join or create another room. */
const LIVE: readonly Phase[] = [
  "theming",
  "voting",
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
];

/**
 * The match `id` is playing, if any. Due timeouts fire first, so a match
 * everyone walked away from ends instead of holding the player forever.
 */
export async function currentMatch(id: PlayerId): Promise<CurrentMatch | null> {
  for (const code of await getBackend().rooms.withPlayer(id, LIVE)) {
    const state = (await applyDueTimeouts(code))?.state;
    const me = state?.players.find((p) => p.id === id);
    if (state && me && !me.away && LIVE.includes(state.phase))
      return { code, game: state.settings.game, phase: state.phase };
  }
  return null;
}

export async function loadRoom(code: string) {
  return getBackend().rooms.get(code);
}

export function seated(state: RoomState, id: PlayerId) {
  return state.players.some((p) => p.id === id);
}
