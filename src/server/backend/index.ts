import "server-only";
import { BACKEND } from "@/config";
import { themes } from "../themes";
import { localAuth } from "./local/auth";
import { localCharacters } from "./local/characters";
import { localFiles } from "./local/files";
import { localRooms } from "./local/rooms";
import { supabaseAuth } from "./supabase/auth";
import { supabaseCharacters } from "./supabase/characters";
import { supabaseFiles } from "./supabase/files";
import { supabaseNotify } from "./supabase/notify";
import { supabaseRooms } from "./supabase/rooms";
import type { Backend } from "./types";

let backend: Backend | null = null;

/** The active backend (local in memory, or Supabase), one per server process. */
export function getBackend(): Backend {
  if (backend) return backend;
  if (BACKEND === "supabase") {
    backend = {
      rooms: supabaseRooms(),
      characters: supabaseCharacters(),
      themes: themes(),
      files: supabaseFiles(),
      auth: supabaseAuth(),
      notify: supabaseNotify(),
    };
    return backend;
  }
  backend = {
    rooms: localRooms(),
    characters: localCharacters(),
    themes: themes(),
    files: localFiles(),
    auth: localAuth(),
    notify: { roomChanged: async () => {}, lobbyChanged: async () => {} },
  };
  return backend;
}
