import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { systemLines } from "@/game/chat";
import { isExpired, createRoom as newRoomState, reduce } from "@/game/engine";
import { presenceDue } from "@/game/helpers";
import { matchRecord } from "@/game/record";
import { themeId } from "@/game/theme-id";
import {
  type Character,
  GameError,
  type GameEvent,
  type Identity,
  type Lang,
  MAX_CHARACTER_NAME,
  type Phase,
  type PickDraft,
  type PlayerId,
  type RoomSettings,
  type RoomState,
  type RuleExamples,
  THEME_IDEAS,
  THEME_OPTIONS,
  type Theme,
} from "@/game/types";
import { toPublicRoom } from "@/game/view";
import { getBackend } from "./backend";
import { background } from "./background";
import { getOrCreateCharacter } from "./characters";
import type { CurrentMatch, ElsewhereRoom } from "./contract";
import { type ExampleSources, voteExamples } from "./rule-examples";
import { drawPopular, PICKS_FETCHED, pickKey } from "./theme-picks";

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

// DARE_SHOW_SCALE speeds the shows up for e2e runs (the step clocks keep their length).
const ctx = () => ({
  now: Date.now(),
  random: Math.random,
  showScale: Number(process.env.DARE_SHOW_SCALE) || 1,
});

/** A chat older than this belongs to a room that died without closing. */
const CHAT_TTL_MS = 24 * 3600_000;

export async function openRoom(host: Identity, settings: RoomSettings) {
  const { rooms, notify, chat } = getBackend();
  // one indexed delete, no cron: the chats of rooms that never closed
  background(() => chat.prune(Date.now() - CHAT_TTL_MS));
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

/** A short random wait before trying again, longer each time, so writers that collided don't collide again. */
const backoff = (attempt: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, (15 + Math.random() * 45) * attempt),
  );

/**
 * Applies one event with optimistic concurrency: load, reduce, compare-and-swap,
 * and on a lost race start over from the newer state. `quiet` writes (pick
 * drafts) change nothing anyone sees: no realtime ping, no room list check,
 * no chat line. The write that wins a transition posts its system lines (the
 * compare-and-swap lets one writer see each), and closing a room clears its
 * chat.
 */
export async function dispatch(
  code: string,
  build: (state: RoomState) => GameEvent | Promise<GameEvent>,
  { quiet = false }: { quiet?: boolean } = {},
): Promise<{ state: RoomState; version: number }> {
  const { rooms, notify, chat } = getBackend();
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) await backoff(attempt);
    const stored = await rooms.get(code);
    if (!stored) throw new GameError("not_found");
    const event = await build(stored.state);
    const c = ctx();
    const next = reduce(stored.state, event, c);
    if (await rooms.compareAndSwap(code, stored.version, next)) {
      const lines = quiet
        ? []
        : systemLines(stored.state, next, c.now, c.showScale);
      if (lines.length)
        background(async () => {
          const newest = (await chat.add(code, lines)).at(-1);
          if (newest) await notify.chatChanged(code, newest.id);
        });
      if (next.phase === "closed" && stored.state.phase !== "closed")
        background(() => chat.clear(code));
      if (!quiet)
        background(() => notify.roomChanged(code, stored.version + 1));
      // Only the write that finished the match gets here, so it is saved once.
      if (next.phase === "finished" && stored.state.phase !== "finished") {
        saveMatch(next);
      }
      if (!quiet && listingChanged(stored.state, next))
        background(notify.lobbyChanged);
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

/** What a picker's card shows, as the browser saves it (the server adds the newId). */
export type DraftCard = Pick<PickDraft, "characterId" | "name" | "imageUrl">;

/**
 * Saves what is on the caller's pick card (null: an empty card), quietly: a
 * draft changes nothing anyone else sees. The card gets its newId on its first
 * save and keeps it, so the character the clock or a confirm makes from it is
 * made once.
 */
export function saveDraft(
  code: string,
  playerId: PlayerId,
  card: DraftCard | null | ((current: PickDraft | null) => DraftCard | null),
) {
  return dispatch(
    code,
    (state): GameEvent => {
      if (!seated(state, playerId)) throw new GameError("not_member");
      const current =
        Object.values(state.assignments).find((a) => a.pickerId === playerId)
          ?.draft ?? null;
      const next = typeof card === "function" ? card(current) : card;
      if (!next) return { type: "DRAFT", playerId, draft: null };
      return {
        type: "DRAFT",
        playerId,
        draft: {
          characterId: next.characterId,
          name: next.name,
          imageUrl: next.imageUrl,
          newId: current?.newId ?? `u-${randomUUID()}`,
        },
      };
    },
    { quiet: true },
  );
}

/** Where the rule scene's cards are read from: the theme starters, then the history. */
const exampleSources = (): ExampleSources => {
  const { characters, matches } = getBackend();
  return {
    starters: () => characters.starters(),
    popularPicks: (id, limit) => matches.popularPicks(id, limit),
    getMany: (ids, lang) => characters.getMany(ids, lang),
  };
};

/** The rule scene's cards for a vote's themes: a room's first match only, never in the way. */
export function roundExamples(
  state: RoomState,
  themes: Theme[],
): Promise<(RuleExamples | null)[] | undefined> {
  return voteExamples(state, themes, exampleSources());
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

/** A draft's name as the clock reads it ("" for an empty card): trimmed, spaces squashed. */
const draftName = (d: PickDraft | null | undefined) =>
  (d?.name ?? "").trim().replace(/\s+/g, " ").slice(0, MAX_CHARACTER_NAME);

/**
 * A fixed "u-<uuid>" for a draft saved without one (older rooms): the same for
 * the room, match and card, so timeouts that race still make one character.
 */
function draftId(state: RoomState, target: PlayerId) {
  const h = createHash("sha256")
    .update(`draft:${state.code}:${state.round}:${target}`)
    .digest("hex");
  return `u-${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/**
 * What the unconfirmed cards become when the clock runs out, by picker:
 * whatever is on the card. The character it shows (picked, or the preview
 * while typing), else the name typed, found in the library or added to it
 * (insert only; idempotent by the draft's id, so timeouts fired by several
 * readers at once make one row). A card the server can't settle here is left
 * to the engine, which plays it as typed.
 */
async function draftedCharacters(
  state: RoomState,
): Promise<Record<PlayerId, Character>> {
  const { characters } = getBackend();
  const out: Record<PlayerId, Character> = {};
  await Promise.all(
    Object.entries(state.assignments).map(async ([target, a]) => {
      const d = a.draft;
      if (a.character || !d) return;
      try {
        if (d.characterId) {
          const shown = await characters.get(d.characterId);
          if (shown) {
            out[a.pickerId] = shown;
            return;
          }
        }
        const name = draftName(d);
        if (!name) return;
        const picker = state.players.find((p) => p.id === a.pickerId);
        out[a.pickerId] = await getOrCreateCharacter({
          id: d.newId ?? draftId(state, target),
          lang: picker?.lang ?? "en",
          name,
          origin: null,
          imageUrl: d.imageUrl,
          createdBy: a.pickerId,
        });
      } catch (e) {
        console.warn("[timeout] draft left as typed:", e);
      }
    }),
  );
  return out;
}

/**
 * Characters for the cards that are still empty when the clock runs out
 * (nothing picked, nothing typed), in the order the engine fills them: for
 * each, one the theme's players picked (when it has history), else a popular
 * one of the library, else a well-known name. Spares follow, in case.
 */
async function fallbackCharacters(
  state: RoomState,
  drafted: Record<PlayerId, Character>,
): Promise<Character[]> {
  const { characters, matches } = getBackend();
  const empty = Object.values(state.assignments).filter(
    (a) => !a.character && !drafted[a.pickerId] && !draftName(a.draft),
  );
  if (empty.length === 0) return [];
  // Language-free keys of what is on the cards already: no card gets it twice.
  const taken = new Set<string>();
  const used = new Set<string>();
  const hold = (c: Character) => {
    used.add(c.id);
    const key = pickKey(c.id);
    if (key) taken.add(key);
  };
  for (const a of Object.values(state.assignments))
    if (a.character) hold(a.character);
  for (const c of Object.values(drafted)) hold(c);
  const free = (c: Character) =>
    !used.has(c.id) && !taken.has(pickKey(c.id) ?? c.id);
  const theme =
    state.theme && state.theme.set !== null ? themeId(state.theme) : null;
  const popular = theme
    ? await matches.popularPicks(theme, PICKS_FETCHED).catch(() => [])
    : [];
  const first: Character[] = [];
  const spare: Character[] = [];
  for (const a of empty) {
    const picker = state.players.find((p) => p.id === a.pickerId);
    const lang: Lang = picker?.lang ?? "en";
    const fromTheme = popular.length
      ? await drawPopular(
          popular,
          lang,
          taken,
          null,
          (ids) => characters.getMany(ids, lang),
          Math.random,
        )
      : null;
    const options = [
      ...(fromTheme ? [fromTheme] : []),
      ...(await characters.randomPopular(lang, 4)),
      ...EMERGENCY[lang].map((name, i) => ({
        id: `emergency-${lang}-${i}`,
        lang,
        name,
        origin: null,
        imageUrl: null,
        aliases: [],
      })),
    ];
    const pick = options.find(free);
    if (pick) {
      first.push(pick);
      hold(pick);
    }
    spare.push(...options);
  }
  return [...new Map([...first, ...spare].map((c) => [c.id, c])).values()];
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
        if (state.phase === "theming") {
          // The host never typed it: everyone votes, on themes from every set.
          const drawn = themes.drawFromBank(THEME_OPTIONS);
          const examples = await roundExamples(state, drawn);
          return {
            type: "TIMEOUT",
            themes: drawn,
            ...(examples ? { examples } : {}),
          };
        }
        if (state.phase === "picking") {
          // Whatever is on a card goes; only empty cards get a fallback.
          const drafted = await draftedCharacters(state);
          return {
            type: "TIMEOUT",
            drafted,
            fallbackCharacters: await fallbackCharacters(state, drafted),
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

/** Every room `player` still sits in, open or closed to newcomers: where a new name or avatar must show. */
const SEATED: readonly Phase[] = ["lobby", ...LIVE, "finished"];

/** Seats given up on the way into another room: lobbies, and podiums of matches already over. */
const LEFT_BEHIND: readonly Phase[] = ["lobby", "finished"];

/**
 * One room at a time: once the player is in `code`, their seats in other
 * lobbies and podiums are given up. A match going on is never left here;
 * joining refuses it first (see currentMatch).
 */
export async function leaveOtherRooms(id: PlayerId, code: string) {
  const codes = await getBackend().rooms.withPlayer(id, LEFT_BEHIND);
  await Promise.all(
    codes
      .filter((c) => c !== code)
      .map((c) =>
        dispatch(c, (state) => {
          // it started in the meantime: that seat stays
          if (!LEFT_BEHIND.includes(state.phase) || !seated(state, id))
            throw new GameError("wrong_phase");
          return { type: "LEAVE", playerId: id };
        }).catch((e: unknown) => {
          if (!(e instanceof GameError)) throw e;
        }),
      ),
  );
}

/**
 * A guest signed in: every seat they hold becomes the account's, so their
 * rooms and matches carry on wherever they signed in from, and their chat
 * lines (with the system lines naming them) move to the account, so they keep
 * the account's name and face. Then one room at a time again: a match going
 * on wins, else `prefer` (the room they came back to).
 */
export async function handOverSeats(
  from: PlayerId,
  player: Identity,
  prefer: string | null,
) {
  const { rooms, chat } = getBackend();
  const codes = await rooms.withPlayer(from, SEATED);
  await Promise.all([
    chat
      .reassign(from, player.id)
      .catch((e: unknown) => console.error("[chat] reassign failed:", e)),
    ...codes.map((code) =>
      dispatch(code, () => ({ type: "SWAP_PLAYER", from, player })).catch(
        (e: unknown) => {
          // the account already sits there, or the room is gone
          if (!(e instanceof GameError)) throw e;
        },
      ),
    ),
  ]);
  const keep = (await currentMatch(player.id))?.code ?? prefer ?? codes[0];
  if (keep) await leaveOtherRooms(player.id, keep);
}

/** Another room `id` sits in and has not left, if any: where their seat in `code` went. */
export async function seatedElsewhere(
  id: PlayerId,
  code: string,
): Promise<ElsewhereRoom | null> {
  const { rooms } = getBackend();
  for (const c of await rooms.withPlayer(id, SEATED)) {
    if (c === code) continue;
    const state = (await rooms.get(c))?.state;
    const me = state?.players.find((p) => p.id === id);
    const host = state?.players.find((p) => p.id === state.hostId);
    if (!state || !me || me.away || !host) continue;
    return {
      code: c,
      name: state.settings.name ?? "",
      host: {
        isGuest: host.isGuest,
        name: host.name,
        guestNumber: host.guestNumber,
      },
    };
  }
  return null;
}

/**
 * Shows the player's new name and avatar in every room they sit in, at once
 * (each change pings the room). A room's name stays as it was, even one
 * named after its host.
 */
export async function syncIdentity(player: Identity) {
  const codes = await getBackend().rooms.withPlayer(player.id, SEATED);
  await Promise.all(
    codes.map((code) =>
      dispatch(code, () => ({ type: "UPDATE_IDENTITY", player })).catch(
        (e: unknown) => {
          if (!(e instanceof GameError)) throw e;
        },
      ),
    ),
  );
}

export async function loadRoom(code: string) {
  return getBackend().rooms.get(code);
}

export function seated(state: RoomState, id: PlayerId) {
  return state.players.some((p) => p.id === id);
}
