import "server-only";
import { GAME_SEATS } from "@/game/games";
import { GOSTO_KEYS } from "@/game/gostos";
import { isPresent } from "@/game/helpers";
import { extraCard, pickMissions } from "@/game/lineup/bank";
import {
  type DrawnLot,
  drawLots,
  MIN_POOL,
  roomPool,
} from "@/game/lineup/deal";
import { lotsFor, roundsFor } from "@/game/lineup/rules";
import type { LuCard, LuDeck } from "@/game/lineup/types";
import {
  type Character,
  GameError,
  type Lang,
  type PlayerId,
  type RoomState,
} from "@/game/types";
import { getBackend } from "./backend";
import { entryId } from "./backend/seed-format";
import { background } from "./background";
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
  const mine = roomPool(pool, on);
  if (mine.length < Math.min(MIN_POOL, pool.length) || !mine.length)
    throw new GameError("few_cards");
  const missions = pickMissions(
    bank,
    {
      heavy: s.heavy,
      off: s.offMissions,
      recent: state.recentMissions ?? [],
      rounds,
    },
    random,
  );
  if (missions.length < rounds) throw new GameError("invalid_input");
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
    return { cards, lots, mission };
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

/**
 * Reactions to the board on stage, a small batch at a time: counted quietly,
 * and shown to everyone at once over the room's channel (they hide nothing).
 */
export async function reactOnStage(
  code: string,
  playerId: PlayerId,
  counts: number[],
) {
  const { state } = await dispatch(
    code,
    (s) => {
      if (!seated(s, playerId)) throw new GameError("not_member");
      return { type: "REACT", playerId, counts };
    },
    { quiet: true },
  );
  const lu = state.lu;
  const owner = lu?.rounds.at(-1)?.order[lu.showing];
  if (owner)
    background(() =>
      getBackend().notify.reacted(code, { board: owner, counts }),
    );
}
