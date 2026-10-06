// The games a room can be set up for. Only one so far; the host can switch the game in the lobby.
export const GAME_KEYS = ["who-am-i"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const DEFAULT_GAME: GameKey = "who-am-i";

/** How many seats a room of each game can have; the host opens and closes them in between. */
export const GAME_SEATS: Record<GameKey, { min: number; max: number }> = {
  "who-am-i": { min: 2, max: 4 },
};

export const isGameKey = (v: unknown): v is GameKey =>
  GAME_KEYS.includes(v as GameKey);
