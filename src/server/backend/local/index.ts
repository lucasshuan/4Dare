import "server-only";
import type { Localized } from "@/game/types";
import type { ThemeExamples } from "../../theme-examples";
import { themes } from "../../themes";
import type { Backend } from "../types";
import { localAuth } from "./auth";
import { localCharacters } from "./characters";
import { localChat } from "./chat";
import { localFiles } from "./files";
import { LOCAL_THEMES } from "./fixtures";
import { localImages } from "./images";
import { localMatches } from "./matches";
import { localMural } from "./mural";
import { localProfiles } from "./profiles";
import { localRooms } from "./rooms";
import { localThemes } from "./themes";

// Local mode (no Supabase keys) in one module: a build made with the keys
// swaps it for off.ts (next.config.ts), so production ships none of it.
export { fixtureLibrary } from "./library";

/** Everything in memory and in .data/, with the fixture library and themes. */
export function localBackend(): Backend {
  const characters = localCharacters();
  return {
    rooms: localRooms(),
    matches: localMatches(),
    characters,
    images: localImages(characters),
    themes: themes(localThemes()),
    files: localFiles(),
    auth: localAuth(),
    profiles: localProfiles(),
    mural: localMural(),
    // no push channel: the screens poll
    notify: {
      roomChanged: async () => {},
      lobbyChanged: async () => {},
      chatChanged: async () => {},
    },
    chat: localChat(),
  };
}

/** The first three fixture themes of each set are its examples. */
export function fixtureExamples(): ThemeExamples {
  const out: ThemeExamples = {};
  for (const { set, en, es, ja, pt } of LOCAL_THEMES) {
    if (!set) continue;
    const list: Localized[] = out[set] ?? [];
    if (list.length < 3) list.push({ en, es, ja, pt });
    out[set] = list;
  }
  return out;
}
