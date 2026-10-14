import "server-only";
import { unstable_cache } from "next/cache";
import { GAME_KEYS, type GameKey } from "@/game/games";
import type { Lang } from "@/game/types";
import { browse, catalog } from "./catalog";
import { helperBoard, rankingBoard, recentFeed } from "./community";
import type {
  ContributionItem,
  LibraryCard,
  LibraryHelper,
  RankingRow,
} from "./community-contract";

/** What the home shows of the community, the same for every reader. */
export interface HomeData {
  /** The week's XP: every game together (top 6), and each game's (top 7). */
  ranks: { all: RankingRow[]; games: Record<GameKey, RankingRow[]> };
  /** Who helped the most this week (top 5). */
  helpers: LibraryHelper[];
  /** The latest contributions, for the ribbon. */
  moments: ContributionItem[];
  /** The library's size and its most picked characters with a picture. */
  library: { characters: number; pictures: number; cards: LibraryCard[] };
}

const settle = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

async function build(lang: Lang): Promise<HomeData> {
  const [all, games, helpers, moments, cat, top] = await Promise.all([
    settle(rankingBoard(null, "week", lang), { rows: [] }),
    Promise.all(
      GAME_KEYS.map((g) => settle(rankingBoard(g, "week", lang), { rows: [] })),
    ),
    settle(helperBoard("week", lang), []),
    settle(recentFeed(lang), []),
    settle(catalog(lang), null),
    settle(
      browse({ q: "", taste: null, sort: "top", need: null, offset: 0 }, lang),
      null,
    ),
  ]);
  return {
    ranks: {
      all: all.rows.slice(0, 6),
      games: Object.fromEntries(
        GAME_KEYS.map((g, i) => [g, games[i].rows.slice(0, 7)]),
      ) as Record<GameKey, RankingRow[]>,
    },
    helpers: helpers.slice(0, 5),
    moments: moments.slice(0, 12),
    library: {
      characters: cat?.rows.length ?? 0,
      pictures: cat?.rows.reduce((n, r) => n + r.pictures, 0) ?? 0,
      cards: (top?.items ?? []).filter((c) => c.imageUrl).slice(0, 14),
    },
  };
}

/** The home's data, kept five minutes. */
export const homeData = unstable_cache(build, ["home-data"], {
  revalidate: 300,
});
