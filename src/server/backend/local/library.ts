import "server-only";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { libraryFor } from "../seed-format";
import { LOCAL_CHARACTERS, LOCAL_ORIGINS } from "./fixtures";

// Local mode has no database: its library is the few fixture characters.
const library = new Map<Lang, SearchItem[]>();

/** The fixture library as search items, most popular first, built once per process. */
export function fixtureLibrary(lang: Lang): SearchItem[] {
  let items = library.get(lang);
  if (!items) {
    items = libraryFor(LOCAL_CHARACTERS, LOCAL_ORIGINS, lang).map(
      ({ character }) => toSearchItem(character),
    );
    library.set(lang, items);
  }
  return items;
}
