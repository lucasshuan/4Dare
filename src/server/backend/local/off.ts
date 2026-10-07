import "server-only";
import type { SearchItem } from "@/game/character-search";
import type { Backend } from "../types";

// What a build made with the Supabase keys gets instead of local mode
// (next.config.ts aliases ./index.ts here): BACKEND is "supabase" in such a
// build, so none of it runs.

const off = (): never => {
  throw new Error("local mode is not in this build (it has the Supabase keys)");
};

export const localBackend = (): Backend => off();
export const fixtureLibrary = (): SearchItem[] => off();
