import "server-only";
import { BACKEND } from "@/config";
import { themes } from "../themes";
import { localAuth } from "./local/auth";
import { localCharacters } from "./local/characters";
import { localChat } from "./local/chat";
import { localFiles } from "./local/files";
import { localMatches } from "./local/matches";
import { localRooms } from "./local/rooms";
import { localThemes } from "./local/themes";
import { supabaseAuth } from "./supabase/auth";
import { supabaseCharacters } from "./supabase/characters";
import { supabaseChat } from "./supabase/chat";
import { supabaseFiles } from "./supabase/files";
import { supabaseMatches } from "./supabase/matches";
import { supabaseNotify } from "./supabase/notify";
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
      themes: themes(supabaseThemes()),
      files: supabaseFiles(),
      auth: supabaseAuth(),
      notify: supabaseNotify(),
      chat: supabaseChat(),
    };
    return backend;
  }
  backend = {
    rooms: localRooms(),
    matches: localMatches(),
    characters: localCharacters(),
    themes: themes(localThemes()),
    files: localFiles(),
    auth: localAuth(),
    // no push channel: the screens poll
    notify: {
      roomChanged: async () => {},
      lobbyChanged: async () => {},
      chatChanged: async () => {},
    },
    chat: localChat(),
  };
  return backend;
}
