// Paths of the games hub. Each game has its page; rooms (/new?game=…, /r/CODE) are shared by all games.
import type { GameKey } from "@/game/games";

export const GAMES = "/";
export const WHO_AM_I = "/who-am-i";
export const IMPOSTOR = "/impostor";
export const WHAT_FOR = "/what-for";
export const NEW_ROOM = "/new";

/** Each game's own page. */
export const GAME_PATHS: Record<GameKey, string> = {
  "who-am-i": WHO_AM_I,
  impostor: IMPOSTOR,
  lineup: WHAT_FOR,
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
export const HOW_TO_PLAY = "/how-to-play";
