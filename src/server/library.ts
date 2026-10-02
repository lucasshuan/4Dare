import "server-only";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import characters from "../../data/characters.json";
import origins from "../../data/origins.json";
import { getBackend } from "./backend";
import {
  libraryFor,
  type SeedCharacter,
  type SeedOrigin,
} from "./backend/seed-format";

// The starter library is bundled with the server, so the search index is built
// once per instance from memory, never from the database.
const library = new Map<Lang, SearchItem[]>();

/** The library as search items, most popular first. */
export function libraryItems(lang: Lang): SearchItem[] {
  let items = library.get(lang);
  if (!items) {
    items = libraryFor(
      characters as unknown as SeedCharacter[],
      origins as unknown as SeedOrigin[],
      lang,
    ).map(({ character }) => toSearchItem(character));
    library.set(lang, items);
  }
  return items;
}

export interface Extras {
  created: SearchItem[];
  images: Record<string, string>;
}

const EXTRAS_TTL = 15_000;
const extras = new Map<Lang, { at: number; value: Promise<Extras> }>();

/** Characters players created and pictures they swapped, refreshed every 15 s per instance. */
export function characterExtras(lang: Lang): Promise<Extras> {
  const cached = extras.get(lang);
  if (cached && Date.now() - cached.at < EXTRAS_TTL) return cached.value;
  const value = getBackend()
    .characters.extras(lang)
    .then(({ created, images }) => ({
      created: created.map(toSearchItem),
      images,
    }));
  // A failed fetch is not cached.
  value.catch(() => extras.delete(lang));
  extras.set(lang, { at: Date.now(), value });
  return value;
}

/** Library plus extras, the same list the browser searches. */
export async function searchableItems(lang: Lang): Promise<SearchItem[]> {
  const { created, images } = await characterExtras(lang);
  const items = libraryItems(lang).map((item): SearchItem => {
    const swapped = images[item[0]];
    return swapped
      ? [item[0], item[1], item[2], swapped, item[4], item[5]]
      : item;
  });
  return [...items, ...created];
}
