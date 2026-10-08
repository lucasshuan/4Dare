// The games a room can be set up for; the host can switch the game in the lobby.
export const GAME_KEYS = ["who-am-i", "impostor", "lineup"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const DEFAULT_GAME: GameKey = "who-am-i";

/**
 * The games anyone can pick: a game still being built stays off the menus
 * and the server won't make a room for it.
 */
export const OPEN_GAMES: readonly GameKey[] = ["who-am-i", "impostor"];

/**
 * How many seats a room of each game can have; the host opens and closes
 * them in between. A match needs `min` players to start.
 */
export const GAME_SEATS: Record<GameKey, { min: number; max: number }> = {
  "who-am-i": { min: 2, max: 4 },
  impostor: { min: 3, max: 10 },
  lineup: { min: 2, max: 8 },
};

export const isGameKey = (v: unknown): v is GameKey =>
  GAME_KEYS.includes(v as GameKey);
