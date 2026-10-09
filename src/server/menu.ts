import "server-only";
import { getBackend } from "./backend";
import { latestNews } from "./news";
import { votingCount } from "./workshop";

/** What the side menu shows beside its rows. */
export interface MenuCounts {
  /** Characters in the library. */
  characters: number;
  /** Workshop suggestions up for votes. */
  voting: number;
  /** The newest news post's time (ms); null when there is none. */
  news: number | null;
}

let cached: { at: number; counts: Promise<MenuCounts> } | null = null;
const TTL = 60_000;

/** The side menu's numbers, read at most once a minute per server instance. */
export function menuCounts(): Promise<MenuCounts> {
  if (cached && Date.now() - cached.at < TTL) return cached.counts;
  const counts = (async (): Promise<MenuCounts> => {
    const { library } = getBackend();
    const [characters, voting, news] = await Promise.all([
      library.total(),
      votingCount(),
      latestNews(),
    ]);
    return { characters, voting, news };
  })();
  cached = { at: Date.now(), counts };
  counts.catch(() => {
    cached = null;
  });
  return counts;
}
