import "server-only";
import { GAME_SEATS } from "@/game/games";
import { GOSTO_KEYS } from "@/game/gostos";
import { isPresent } from "@/game/helpers";
import { extraCard, pickMissions } from "@/game/lineup/bank";
import {
  type DrawnLot,
  drawLots,
  MIN_POOL,
  roomDeck,
} from "@/game/lineup/deal";
import { lotsFor, roundsFor } from "@/game/lineup/rules";
import type { LuCard, LuDeck } from "@/game/lineup/types";
import {
  type Character,
  GameError,
  type GameEvent,
  type Lang,
  type PlayerId,
  type RoomState,
} from "@/game/types";
import { getBackend } from "./backend";
import { entryId, parseEntryId } from "./backend/seed-format";
import { background } from "./background";
import type { QueueItem } from "./contract";
import { dispatch, seated } from "./rooms";

/** A drawn character as a card on the table, in the room's language. */
const charCard = (
  lot: Extract<DrawnLot, { kind: "char" }>,
  c: Character,
): LuCard => ({
  id: lot.id,
  name: c.name,
  origin: c.origin,
  imageUrl: c.imageUrl,
  gosto: lot.gosto,
  ...(lot.star ? { star: true as const } : {}),
});

/**
 * Every round's cards and mission, in the host's language. Drawn for the
 * room's open seats and the most rounds it may play: whoever sits down or
 * leaves before the start changes nothing (the engine takes what it needs).
 * The gostos the room left on need MIN_POOL known characters.
 */
export async function lineupDecks(
  state: RoomState,
  random: () => number = Math.random,
): Promise<LuDeck[]> {
  const { lineup, characters } = getBackend();
  const s = state.settings;
  const host = state.players.find((p) => p.id === state.hostId);
  const lang: Lang = host?.lang ?? "en";
  const seats = Math.max(
    state.players.filter(isPresent).length,
    Math.min(s.seats, GAME_SEATS.lineup.max),
  );
  const lots = lotsFor(seats, s.lotsPerSeat);
  // the most rounds the table may play: as many as the fewest players get
  const rounds = roundsFor(GAME_SEATS.lineup.min, s.rounds);
  const [pool, extras, bank] = await Promise.all([
    lineup.pool(lang),
    lineup.extras(),
    lineup.missions(),
  ]);
  const on = GOSTO_KEYS.filter((g) => !s.offGostos.includes(g));
  const mine = roomDeck(pool, s.offGostos);
  if (mine.length < Math.min(MIN_POOL, pool.length) || !mine.length)
    throw new GameError("few_cards");
  // with a presenter, three missions a round to choose from (the first stands in)
  const each = s.mode === "host" ? 3 : 1;
  const drawnMissions = pickMissions(
    bank,
    {
      heavy: s.heavy,
      off: s.offMissions,
      recent: state.recentMissions ?? [],
      rounds: rounds * each,
    },
    random,
  );
  if (drawnMissions.length < rounds) throw new GameError("invalid_input");
  const options = Array.from({ length: rounds }, (_, r) =>
    drawnMissions.filter((_, k) => k % rounds === r),
  );
  const missions = options.map((o) => o[0]);
  // spares for teams left empty: one per seat
  const used = new Set<string>();
  const drawn = missions.map(() =>
    drawLots(mine, { on, count: lots + seats, extras, used }, random),
  );
  const ids = drawn.flatMap((d) =>
    d.flatMap((l) => (l.kind === "char" ? [entryId(lang, l.id)] : [])),
  );
  const found = new Map(
    (await characters.getMany(ids, lang)).map((c) => [c.id, c]),
  );
  return missions.map((mission, r) => {
    const cards = drawn[r].flatMap((l): LuCard[] => {
      if (l.kind === "extra") return [extraCard(l.extra, lang)];
      const c = found.get(entryId(lang, l.id));
      return c?.imageUrl ? [charCard(l, c)] : [];
    });
    if (cards.length < lots) throw new GameError("few_cards");
    return {
      cards,
      lots,
      mission,
      ...(each > 1 ? { options: options[r] } : {}),
    };
  });
}

/** The caller's board as they lay it out, quietly: nobody else sees it before the stage. */
export function saveLineupBoard(
  code: string,
  playerId: PlayerId,
  board: unknown,
) {
  return dispatch(
    code,
    (state) => {
      if (!seated(state, playerId)) throw new GameError("not_member");
      return { type: "BOARD", playerId, board };
    },
    { quiet: true },
  );
}

/** Thrown inside a dispatch when the stage closed before a batch of reactions came. */
const LATE = new Error("late");

/**
 * Reactions to the board on stage, a small batch at a time: counted quietly,
 * and shown to everyone at once over the room's channel (they hide nothing).
 */
export async function reactOnStage(
  code: string,
  playerId: PlayerId,
  board: PlayerId,
  counts: number[],
) {
  try {
    await dispatch(
      code,
      (s) => {
        if (!seated(s, playerId)) throw new GameError("not_member");
        if (s.phase !== "presenting") throw LATE;
        return { type: "REACT", playerId, board, counts };
      },
      { quiet: true },
    );
  } catch (e) {
    // the stage closed while the batch was on its way: nothing to count
    if (e === LATE) return;
    throw e;
  }
  background(() => getBackend().notify.reacted(code, { board, counts }));
}

const fail = (): never => {
  throw new GameError("invalid_input");
};

/** A name written on a paper card: up to this many characters. */
export const PAPER_MAX = 40;

/** The paper card for a name written by hand: its id follows the name, so one name is one card. */
export function paperCard(raw: string): LuCard | null {
  const name = raw.replace(/\s+/g, " ").trim();
  if (!name || [...name].length > PAPER_MAX) return null;
  const key = name
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
  return {
    id: `paper:${key}`,
    name,
    origin: null,
    imageUrl: null,
    emoji: "✍️",
    tint: "#fff6e2",
  };
}

/**
 * The presenter's queue, made into cards in the deck's language (the
 * host's): dealt ones as they are, library characters with their name and
 * picture (never one of the blocked), extras, paper cards.
 */
export function queueLots(
  code: string,
  playerId: PlayerId,
  items: QueueItem[],
) {
  const { lineup, characters } = getBackend();
  return dispatch(code, async (s): Promise<GameEvent> => {
    if (!seated(s, playerId)) throw new GameError("not_member");
    const lu = s.lu ?? fail();
    const deck = lu.decks[lu.round - 1] ?? fail();
    const lang: Lang = s.players.find((p) => p.id === s.hostId)?.lang ?? "en";
    // a search row's id ("pt-wd-Q302") or the library's own ("wd-Q302")
    const libraryId = (id: string) => parseEntryId(id)?.id ?? id;
    const ids = items.flatMap((x) =>
      x.kind === "char" ? [libraryId(x.id)] : [],
    );
    const [found, extras, blocked] = await Promise.all([
      ids.length
        ? characters.getMany(
            ids.map((id) => entryId(lang, id)),
            lang,
          )
        : [],
      items.some((x) => x.kind === "extra") ? lineup.extras() : [],
      ids.length ? lineup.blocked() : new Set<string>(),
    ]);
    const byId = new Map(found.map((c) => [c.id, c]));
    const card = (x: QueueItem): LuCard | undefined => {
      if (x.kind === "deal") return deck.cards[x.i];
      if (x.kind === "paper") return paperCard(x.name) ?? undefined;
      if (x.kind === "extra") {
        const extra = extras.find((e) => e.id === x.id);
        return extra && extraCard(extra, lang);
      }
      const id = libraryId(x.id);
      const c = blocked.has(id) ? undefined : byId.get(entryId(lang, id));
      return (
        c && {
          id,
          name: c.name,
          origin: c.origin ?? null,
          imageUrl: c.imageUrl ?? null,
          ...(c.imageUrl ? {} : { emoji: "✍️", tint: "#fff6e2" }),
        }
      );
    };
    const cards = items.map((x) => card(x) ?? fail());
    return { type: "QUEUE", playerId, cards };
  });
}

/** "What for ____": a player's guess while the presenter chooses; nobody else sees it before the envelope. */
export function sendHunch(code: string, playerId: PlayerId, text: string) {
  return dispatch(
    code,
    (s) => {
      if (!seated(s, playerId)) throw new GameError("not_member");
      return { type: "HUNCH", playerId, text };
    },
    { quiet: true },
  );
}

/** The presenter's verdict: a draft quietly (only they see it), the final one for everyone. */
export function sendVerdict(
  code: string,
  playerId: PlayerId,
  v: { ownerId: PlayerId; why: string; final: boolean },
) {
  return dispatch(
    code,
    (s) => {
      if (!seated(s, playerId)) throw new GameError("not_member");
      return { type: "VERDICT", playerId, ...v };
    },
    { quiet: !v.final },
  );
}
