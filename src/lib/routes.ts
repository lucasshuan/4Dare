// Paths of the games hub. Each game has its page; rooms (/new?game=…, /r/CODE) are shared by all games.
import type { GameKey } from "@/game/games";

export const GAMES = "/";
export const WHO_AM_I = "/who-am-i";
export const IMPOSTOR = "/impostor";
export const BUILD_THE_TEAM = "/build-the-team";
export const NEW_ROOM = "/new";

/** Each game's own page. */
export const GAME_PATHS: Record<GameKey, string> = {
  "who-am-i": WHO_AM_I,
  impostor: IMPOSTOR,
  lineup: BUILD_THE_TEAM,
};

/** The create-room screen, set up for `game`. */
export const newRoom = (game: GameKey) => `${NEW_ROOM}?game=${game}`;

/** Every listed room; the filters live in the link. */
export const ROOMS = "/rooms";

/** The room list, filtered to `game` when given. */
export const roomsOf = (game?: GameKey) =>
  game ? `${ROOMS}?game=${game}` : ROOMS;

/** Pages of the side menu outside the games. */
export const SETTINGS = "/settings";

/** The characters page, and one character's sheet (over the list from inside the app). */
export const CHARACTERS = "/characters";
export const characterPath = (id: string) => `${CHARACTERS}/${id}`;

/** The Workshop, one suggestion in it (a shared link), and the curators' queue. */
export const WORKSHOP = "/workshop";
export const workshopPath = (id: string) => `${WORKSHOP}/${id}`;
export const WORKSHOP_REVIEW = "/workshop/review";

/** The community pages and the help ones. */
export const RANKINGS = "/rankings";
export const PLAYERS = "/players";
export const CONTRIBUTIONS = "/contributions";
export const NEWS = "/news";
export const PRIVACY = "/privacy";
export const TERMS = "/terms";
