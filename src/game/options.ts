// What a person picks that follows their account from device to device:
// the theme, the chat bubbles and each game's own options. Sound stays on
// each device (src/lib/settings.ts). Kept on profiles.settings.
import type { GameKey } from "./games";

/**
 * Each game's own options, with their defaults. The settings dialog lists a
 * game's options from here, so a new game brings its own entry.
 */
export const GAME_OPTIONS = {
  "who-am-i": {
    /** Passing the turn asks for a second tap. */
    confirmPass: false,
    /** The hand of the theme's popular characters under the card being filled. */
    popularHand: true,
  },
} as const satisfies Record<GameKey, Record<string, boolean>>;
export type GameOption<G extends GameKey> = keyof (typeof GAME_OPTIONS)[G];
export type GameOptions = {
  [G in GameKey]: Record<GameOption<G>, boolean>;
};

export const THEMES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEMES)[number];

export interface SyncedSettings {
  /** Null until the person picks one on some device. */
  theme: ThemeChoice | null;
  chatBubbles: boolean;
  games: GameOptions;
}

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const flag = (v: unknown, fallback: boolean) =>
  typeof v === "boolean" ? v : fallback;

/** Every game's options read back: what is missing or unknown takes its default. */
export function parseGameOptions(raw: unknown): GameOptions {
  const games = record(raw);
  return Object.fromEntries(
    Object.entries(GAME_OPTIONS).map(([game, options]) => {
      const saved = record(games[game]);
      return [
        game,
        Object.fromEntries(
          Object.entries(options).map(([k, d]) => [k, flag(saved[k], d)]),
        ),
      ];
    }),
  ) as GameOptions;
}

export function parseSynced(raw: unknown): SyncedSettings {
  const r = record(raw);
  return {
    theme: (THEMES as readonly unknown[]).includes(r.theme)
      ? (r.theme as ThemeChoice)
      : null,
    chatBubbles: flag(r.chatBubbles, true),
    games: parseGameOptions(r.games),
  };
}
