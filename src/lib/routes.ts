// Paths of the games hub. Each game has its page; rooms (/new?game=…, /r/CODE) are shared by all games.
import type { GameKey } from "@/game/games";

export const GAMES = "/";
export const WHO_AM_I = "/who-am-i";
export const NEW_ROOM = "/new";

/** Each game's own page. */
export const GAME_PATHS: Record<GameKey, string> = { "who-am-i": WHO_AM_I };

/** The create-room screen, set up for `game`. */
export const newRoom = (game: GameKey) => `${NEW_ROOM}?game=${game}`;
