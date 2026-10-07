import "server-only";
import { themes } from "../../themes";
import type { Backend } from "../types";
import { localAuth } from "./auth";
import { localBadges } from "./badges";
import { localCharacters } from "./characters";
import { localChat } from "./chat";
import { localFiles } from "./files";
import { localImages } from "./images";
import { localMatches } from "./matches";
import { localMural } from "./mural";
import { localProfiles } from "./profiles";
import { localQuestions } from "./questions";
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
    questions: localQuestions(),
    images: localImages(characters),
    themes: themes(localThemes()),
    files: localFiles(),
    auth: localAuth(),
    profiles: localProfiles(),
    mural: localMural(),
    badges: localBadges(),
    // no push channel: the screens poll
    notify: {
      roomChanged: async () => {},
      lobbyChanged: async () => {},
      chatChanged: async () => {},
    },
    chat: localChat(),
  };
}
