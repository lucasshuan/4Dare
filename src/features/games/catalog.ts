// What the games page sorts and filters by, and the filters as its link carries them.
import { GAME_SEATS, type GameKey, OPEN_GAMES } from "@/game/games";
import { fold } from "@/lib/fold";

/** Featured: the hub's own order. */
export const GAME_SORTS = ["featured", "popular", "name"] as const;
export type GameSort = (typeof GAME_SORTS)[number];

export interface GameFilters {
  /** Matched against the name and the pitch; empty: no search. */
  q: string;
  /** Games a table this big can play; null: any. */
  players: number | null;
  sort: GameSort;
}

export const NO_FILTERS: GameFilters = {
  q: "",
  players: null,
  sort: "featured",
};

/** Every table size some open game takes, smallest first. */
export const PLAYER_COUNTS: readonly number[] = (() => {
  const min = Math.min(...OPEN_GAMES.map((g) => GAME_SEATS[g].min));
  const max = Math.max(...OPEN_GAMES.map((g) => GAME_SEATS[g].max));
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
})();

/** Whether anything narrows the list (the sort does not). */
export const isFiltered = (f: GameFilters) => !!(f.q.trim() || f.players);

/** The filters as the link carries them: only what differs from the defaults. */
export function toSearch({ q, players, sort }: GameFilters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (players) params.set("players", String(players));
  if (sort !== "featured") params.set("sort", sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** The filters a link carries (?q=vote&players=4&sort=name), each optional; anything unknown is dropped. */
export function fromSearch(search: string): GameFilters {
  const sp = new URLSearchParams(search);
  const players = Number(sp.get("players"));
  const sort = sp.get("sort");
  return {
    q: (sp.get("q") ?? "").slice(0, 50),
    players: PLAYER_COUNTS.includes(players) ? players : null,
    sort: GAME_SORTS.includes(sort as GameSort)
      ? (sort as GameSort)
      : "featured",
  };
}

/**
 * The open games the filters keep, in their order. `text` is what a search
 * looks through for a game, `name` what the A–Z sort reads, `online` how many
 * play each now (null while loading: featured order).
 */
export function pickGames(
  f: GameFilters,
  {
    text,
    name,
    online,
    locale,
  }: {
    text: (game: GameKey) => string;
    name: (game: GameKey) => string;
    online: Partial<Record<GameKey, number>> | null;
    locale: string;
  },
): GameKey[] {
  const q = fold(f.q);
  const playing = (g: GameKey) => online?.[g] ?? 0;
  const kept = OPEN_GAMES.filter(
    (g) =>
      (!q || fold(text(g)).includes(q)) &&
      (!f.players ||
        (GAME_SEATS[g].min <= f.players && f.players <= GAME_SEATS[g].max)),
  );
  if (f.sort === "name")
    return kept.sort((a, b) => name(a).localeCompare(name(b), locale));
  // stable: a tie keeps the featured order
  if (f.sort === "popular") return kept.sort((a, b) => playing(b) - playing(a));
  return kept;
}
