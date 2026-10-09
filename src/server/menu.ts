import "server-only";
import { getBackend } from "./backend";

/** What the side menu shows beside its rows. */
export interface MenuCounts {
  /** Characters in the library. */
  characters: number;
}

let cached: { at: number; counts: Promise<MenuCounts> } | null = null;
const TTL = 60_000;

/** The side menu's numbers, read at most once a minute per server instance. */
export function menuCounts(): Promise<MenuCounts> {
  if (cached && Date.now() - cached.at < TTL) return cached.counts;
  const counts = (async (): Promise<MenuCounts> => {
    const { library } = getBackend();
    return { characters: await library.total() };
  })();
  cached = { at: Date.now(), counts };
  counts.catch(() => {
    cached = null;
  });
  return counts;
}
