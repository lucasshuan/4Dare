import "server-only";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { getBackend } from "./backend";

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
