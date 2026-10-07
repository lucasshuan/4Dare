import "server-only";
import { BACKEND } from "@/config";
// one entry, so a build with the Supabase keys can leave it out (next.config.ts)
import { localBackend } from "@/server/backend/local";
import { themes } from "../themes";
import { supabaseAuth } from "./supabase/auth";
import { supabaseCharacters } from "./supabase/characters";
import { supabaseChat } from "./supabase/chat";
import { supabaseFiles } from "./supabase/files";
import { supabaseImages } from "./supabase/images";
import { supabaseMatches } from "./supabase/matches";
import { supabaseMural } from "./supabase/mural";
import { supabaseNotify } from "./supabase/notify";
import { supabaseProfiles } from "./supabase/profiles";
import { supabaseRooms } from "./supabase/rooms";
import { supabaseThemes } from "./supabase/themes";
import type { Backend } from "./types";

let backend: Backend | null = null;

/** The active backend (local in memory, or Supabase), one per server process. */
export function getBackend(): Backend {
  if (backend) return backend;
  if (BACKEND === "supabase") {
    backend = {
      rooms: supabaseRooms(),
      matches: supabaseMatches(),
      characters: supabaseCharacters(),
      images: supabaseImages(),
      themes: themes(supabaseThemes()),
      files: supabaseFiles(),
      auth: supabaseAuth(),
      profiles: supabaseProfiles(),
      mural: supabaseMural(),
      notify: supabaseNotify(),
      chat: supabaseChat(),
    };
    return backend;
  }
  backend = localBackend();
  return backend;
}
