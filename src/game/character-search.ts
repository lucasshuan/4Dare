// Character autocomplete that runs in memory, in the browser: one download per
// language (cached), then every keystroke is a scan over pre-normalised keys,
// well under a millisecond for ~8k characters. No server round trip per key.
import { normalizeName } from "./match";

/**
 * One searchable character, as compact arrays to keep the download small:
 * [id, name, origin, imageUrl, nameKey, otherKeys]. `nameKey` is the
 * normalised name; `otherKeys` holds the name's words and the aliases,
 * normalised, each preceded by a space (" darth vader lordvader").
 */
export type SearchItem = [
  id: string,
  name: string,
  origin: string | null,
  imageUrl: string | null,
  nameKey: string,
  otherKeys: string,
];

export interface SearchResult {
  id: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
}

const WORDS = /[\s\-‐–—・·.,:;!?/()（）「」『』&]+/u;

/** Builds the item on the server, so browsers never normalise thousands of names. */
export function toSearchItem(c: {
  id: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  aliases: string[];
}): SearchItem {
  const nameKey = normalizeName(c.name);
  const others = new Set<string>();
  for (const word of c.name.split(WORDS)) others.add(normalizeName(word));
  for (const alias of c.aliases) others.add(normalizeName(alias));
  others.delete("");
  others.delete(nameKey);
  const otherKeys = [...others].map((key) => ` ${key}`).join("");
  return [c.id, c.name, c.origin, c.imageUrl, nameKey, otherKeys];
}

/** 0 exact name, 1 name starts with q, 2 a word or alias starts with q, 3 contains q, -1 no match. */
function tier(item: SearchItem, q: string, spaced: string): number {
  const name = item[4];
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  const others = item[5];
  if (others.includes(spaced)) return 2;
  if (name.includes(q) || others.includes(q)) return 3;
  return -1;
}

const toResult = (item: SearchItem): SearchResult => ({
  id: item[0],
  name: item[1],
  origin: item[2],
  imageUrl: item[3],
});

/** Last query per item list: typing one more letter only rescans what still matched. */
const narrowing = new WeakMap<SearchItem[], { q: string; hits: number[] }>();

/**
 * Best `limit` matches for `query`. `items` must be sorted by popularity
 * (most popular first): within a tier, earlier items win.
 */
export function searchItems(
  items: SearchItem[],
  query: string,
  limit: number,
): SearchResult[] {
  const q = normalizeName(query);
  if (!q) return items.slice(0, limit).map(toResult);
  const spaced = ` ${q}`;
  const previous = narrowing.get(items);
  const candidates =
    previous && q.startsWith(previous.q) ? previous.hits : null;
  const tiers: SearchItem[][] = [[], [], [], []];
  const hits: number[] = [];
  const visit = (index: number) => {
    const item = items[index];
    const t = tier(item, q, spaced);
    if (t < 0) return;
    hits.push(index);
    if (tiers[t].length < limit) tiers[t].push(item);
  };
  if (candidates) for (const index of candidates) visit(index);
  else for (let index = 0; index < items.length; index++) visit(index);
  narrowing.set(items, { q, hits });
  return tiers.flat().slice(0, limit).map(toResult);
}

const THUMB_WIDTHS = [60, 120, 250, 330, 500];

/**
 * A smaller copy of a library picture for list rows: Wikimedia thumbnails in a
 * standard width, AniList's medium size. Anything else is returned unchanged.
 */
export function thumbUrl(url: string | null, width: number): string | null {
  if (!url) return url;
  if (
    url.startsWith("https://upload.wikimedia.org/") &&
    url.includes("/thumb/")
  ) {
    const size = THUMB_WIDTHS.find((w) => w >= width) ?? 500;
    return url.replace(/\/\d+px-([^/]+)$/, `/${size}px-$1`);
  }
  if (url.startsWith("https://s4.anilist.co/"))
    return url.replace("/large/", "/medium/");
  return url;
}
