// What the games page sorts and filters by, and the filters as its link carries them.
import { GAME_SEATS, type GameKey, OPEN_GAMES } from "@/game/games";
import { fold } from "@/lib/fold";

/** How a game plays, as the page's style chips name it (games.tags.<key>). */
export const GAME_TAGS = [
  "deduction",
  "bluff",
  "questions",
  "voting",
  "auction",
  "creative",
] as const;
export type GameTag = (typeof GAME_TAGS)[number];

export const TAGS_OF: Record<GameKey, readonly GameTag[]> = {
  "who-am-i": ["deduction", "questions"],
  impostor: ["bluff", "deduction", "voting"],
  lineup: ["auction", "creative", "voting"],
};

/** Featured: the hub's own order. */
export const GAME_SORTS = ["featured", "popular", "name"] as const;
export type GameSort = (typeof GAME_SORTS)[number];

export interface GameFilters {
  /** Matched against the name, the pitch and the style; empty: no search. */
  q: string;
  /** Games a table this big can play; null: any. */
  players: number | null;
  /** Games with any of these styles; none: every style. */
  tags: GameTag[];
  /** Only games with someone playing right now. */
  online: boolean;
  sort: GameSort;
}

export const NO_FILTERS: GameFilters = {
  q: "",
  players: null,
  tags: [],
  online: false,
  sort: "featured",
};

/** Every table size some open game takes, smallest first. */
export const PLAYER_COUNTS: readonly number[] = (() => {
  const min = Math.min(...OPEN_GAMES.map((g) => GAME_SEATS[g].min));
  const max = Math.max(...OPEN_GAMES.map((g) => GAME_SEATS[g].max));
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
})();

/** Whether anything narrows the list (the sort does not). */
export const isFiltered = (f: GameFilters) =>
  !!(f.q.trim() || f.players || f.tags.length || f.online);

/** The filters as the link carries them: only what differs from the defaults. */
export function toSearch({ q, players, tags, online, sort }: GameFilters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (players) params.set("players", String(players));
  if (tags.length) params.set("tags", tags.join());
  if (online) params.set("online", "1");
  if (sort !== "featured") params.set("sort", sort);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** The filters a link carries (?q=vote&players=4&tags=bluff,voting&online=1&sort=name), each optional; anything unknown is dropped. */
export function fromSearch(search: string): GameFilters {
  const sp = new URLSearchParams(search);
  const players = Number(sp.get("players"));
  const tags = sp.get("tags")?.split(",") ?? [];
  const sort = sp.get("sort");
  return {
    q: (sp.get("q") ?? "").slice(0, 50),
    players: PLAYER_COUNTS.includes(players) ? players : null,
    tags: GAME_TAGS.filter((t) => tags.includes(t)),
    online: sp.get("online") === "1",
    sort: GAME_SORTS.includes(sort as GameSort)
      ? (sort as GameSort)
      : "featured",
  };
}

/**
 * The open games the filters keep, in their order. `text` is what a search
 * looks through for a game, `name` what the A–Z sort reads, `online` how many
 * play each now (null while loading: nobody filtered out, featured order).
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
        (GAME_SEATS[g].min <= f.players && f.players <= GAME_SEATS[g].max)) &&
      (!f.tags.length || f.tags.some((t) => TAGS_OF[g].includes(t))) &&
      (!f.online || !online || playing(g) > 0),
  );
  if (f.sort === "name")
    return kept.sort((a, b) => name(a).localeCompare(name(b), locale));
  // stable: a tie keeps the featured order
  if (f.sort === "popular") return kept.sort((a, b) => playing(b) - playing(a));
  return kept;
}
