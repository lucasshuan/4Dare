import "server-only";
import { isExpired, createRoom as newRoomState, reduce } from "@/game/engine";
import { matchRecord } from "@/game/record";
import {
  type Character,
  GameError,
  type GameEvent,
  type Identity,
  type Lang,
  type PlayerId,
  type RoomSettings,
  type RoomState,
} from "@/game/types";
import { getBackend } from "./backend";
import { background } from "./background";

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
      if (settings.visibility === "public") background(notify.lobbyChanged);
      return state.code;
    }
  }
  throw new GameError("unknown");
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
      if (next.phase === "lobby" || stored.state.phase === "lobby") {
        background(notify.lobbyChanged);
      }
      return { state: next, version: stored.version + 1 };
    }
  }
  throw new GameError("conflict");
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

/** Fires the TIMEOUTs that are due. Losing a race to another reader is fine. */
/** Fires the clock timeouts that are due and returns the room as it is now (one read when nothing is due). */
export async function applyDueTimeouts(code: string) {
  const { rooms, themes } = getBackend();
  let stored = await rooms.get(code);
  for (let i = 0; i < 4; i++) {
    if (!stored || !isExpired(stored.state, Date.now())) return stored;
    try {
      stored = await dispatch(code, async (state) => {
        if (!isExpired(state, Date.now())) throw new GameError("wrong_phase");
        if (state.phase === "lobby") {
          return { type: "TIMEOUT", theme: themes.drawFromBank() };
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

export async function loadRoom(code: string) {
  return getBackend().rooms.get(code);
}

export function seated(state: RoomState, id: PlayerId) {
  return state.players.some((p) => p.id === id);
}
