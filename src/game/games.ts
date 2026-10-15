// The games a room can be set up for; the host can switch the game in the lobby.
import { tunable } from "./tune";

export const GAME_KEYS = ["who-am-i", "impostor", "lineup"] as const;
export type GameKey = (typeof GAME_KEYS)[number];

export const DEFAULT_GAME: GameKey = "who-am-i";

/**
 * Where a game stands: open to everyone, in test (only the admin sees it,
 * marked as a test, to play it for real before opening it) or closed (off the
 * menus; the server won't make a room for it). The panel sets it per game.
 */
export type Availability = "open" | "test" | "closed";

/** Each game's standing in the code; the panel's value wins (key `games.<game>`). */
export const AVAILABILITY = tunable<Record<GameKey, Availability>>("games", {
  "who-am-i": "open",
  impostor: "open",
  lineup: "open",
});

let viewerAdmin = false;

/** The browser says whether the person is the admin, who also sees the games in test. */
export function setViewerAdmin(admin: boolean) {
  viewerAdmin = admin;
}

/** Whether a game is on the menus for this viewer (`admin` for a server read). */
export const isPlayable = (game: GameKey, admin = viewerAdmin) => {
  const a = AVAILABILITY[game];
  return a === "open" || (a === "test" && admin);
};

/** A game the admin sees in test: the menus mark it. */
export const inTest = (game: GameKey) => AVAILABILITY[game] === "test";

/**
 * The games this viewer can pick, in order, read live: a game in test only
 * for the admin, a closed one for nobody. Use it as an array.
 */
export const OPEN_GAMES: readonly GameKey[] = new Proxy([] as GameKey[], {
  get(_, prop) {
    const list = GAME_KEYS.filter((g) => isPlayable(g));
    const v = Reflect.get(list, prop);
    return typeof v === "function" ? v.bind(list) : v;
  },
  has: (_, prop) =>
    Reflect.has(
      GAME_KEYS.filter((g) => isPlayable(g)),
      prop,
    ),
  ownKeys: () => Reflect.ownKeys(GAME_KEYS.filter((g) => isPlayable(g))),
  getOwnPropertyDescriptor: (_, prop) =>
    Reflect.getOwnPropertyDescriptor(
      GAME_KEYS.filter((g) => isPlayable(g)),
      prop,
    ),
});

/**
 * How many seats a room of each game can have; the host opens and closes
 * them in between. A match needs `min` players to start.
 */
export const GAME_SEATS: Record<GameKey, { min: number; max: number }> = {
  "who-am-i": { min: 2, max: 6 },
  impostor: { min: 3, max: 10 },
  lineup: { min: 2, max: 8 },
};

export const isGameKey = (v: unknown): v is GameKey =>
  GAME_KEYS.includes(v as GameKey);
