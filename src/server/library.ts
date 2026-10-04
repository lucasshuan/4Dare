import "server-only";
import { BACKEND } from "@/config";
import type { SearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { fixtureLibrary } from "@/server/backend/local";
import { supabaseLibrary } from "./backend/supabase/library";

// On Supabase the library lives in the database and each instance keeps the
// index for an hour; local mode builds it from its fixtures.
const fromDatabase = supabaseLibrary();

/** The library as search items, most popular first. */
export async function libraryItems(lang: Lang): Promise<SearchItem[]> {
  return BACKEND === "supabase" ? fromDatabase(lang) : fixtureLibrary(lang);
}
