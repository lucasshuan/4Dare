import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import {
  libraryFor,
  type SeedCharacter,
  type SeedOrigin,
} from "../seed-format";

// Local mode has no database, so the starter files in data/ are its library.
// They are read at run time and marked for the bundler, so they never ship
// inside a server function (local mode never runs on Vercel).
function readData<T>(name: string): T {
  const file = join(/* turbopackIgnore: true */ process.cwd(), "data", name);
  return JSON.parse(
    readFileSync(/* turbopackIgnore: true */ file, "utf8"),
  ) as T;
}

let files: { characters: SeedCharacter[]; origins: SeedOrigin[] } | null = null;
const library = new Map<Lang, SearchItem[]>();

/** The starter files as search items, most popular first, built once per process. */
export function fileLibrary(lang: Lang): SearchItem[] {
  let items = library.get(lang);
  if (!items) {
    files ??= {
      characters: readData<SeedCharacter[]>("characters.json"),
      origins: readData<SeedOrigin[]>("origins.json"),
    };
    items = libraryFor(files.characters, files.origins, lang).map(
      ({ character }) => toSearchItem(character),
    );
    library.set(lang, items);
  }
  return items;
}
