// The last room setup, so the next room starts the same way. Kept in this browser only.
import { DEFAULT_GAME } from "@/game/games";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import {
  DEFAULT_SETTINGS,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
} from "@/game/types";
import type { CreateRoomInput } from "@/server/contract";

const KEY = "4dare:who-am-i:setup";

export const DEFAULT_SETUP: CreateRoomInput = {
  game: DEFAULT_GAME,
  name: "",
  password: "",
  visibility: DEFAULT_SETTINGS.visibility,
  seats: DEFAULT_SETTINGS.seats,
  voteSeconds: DEFAULT_SETTINGS.voteSeconds,
  askSeconds: DEFAULT_SETTINGS.askSeconds,
  guessSeconds: DEFAULT_SETTINGS.guessSeconds,
  answerSeconds: DEFAULT_SETTINGS.answerSeconds,
  validateSeconds: DEFAULT_SETTINGS.validateSeconds,
  themeMode: DEFAULT_SETTINGS.themeMode,
  themeSets: [...THEME_SET_KEYS],
};

const oneOf = <T>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/**
 * The setup saved last, field by field; anything missing or odd falls back to
 * the default. The game comes from the link; each room gets its own name and
 * password, and starts public with 4 seats (none of these stored here). A
 * room saved private never comes back private: its password isn't kept, and
 * a private room without one is refused, so every new room would fail.
 */
export function loadSetup(): CreateRoomInput {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {}
  const d = DEFAULT_SETUP;
  const seconds = (v: unknown, fallback: number) =>
    typeof v === "number" &&
    Number.isInteger(v) &&
    v >= STEP_SECONDS_MIN &&
    v <= STEP_SECONDS_MAX
      ? v
      : fallback;
  // Saved as the sets turned off, so a set added later starts on.
  const off = Array.isArray(saved.setsOff) ? saved.setsOff : [];
  const themeSets = THEME_SET_KEYS.filter((k) => !off.includes(k));
  return {
    game: d.game,
    name: d.name,
    password: d.password,
    visibility: d.visibility,
    seats: d.seats,
    voteSeconds: seconds(saved.voteSeconds, d.voteSeconds),
    askSeconds: seconds(saved.askSeconds, d.askSeconds),
    guessSeconds: seconds(saved.guessSeconds, d.guessSeconds),
    answerSeconds: seconds(saved.answerSeconds, d.answerSeconds),
    validateSeconds: seconds(saved.validateSeconds, d.validateSeconds),
    themeMode: oneOf(saved.themeMode, ["vote", "host"], d.themeMode),
    themeSets: themeSets.length ? themeSets : d.themeSets,
  };
}

export function saveSetup({
  game: _game,
  name: _name,
  password: _password,
  visibility: _visibility,
  seats: _seats,
  themeSets,
  ...rest
}: CreateRoomInput) {
  const setsOff = THEME_SET_KEYS.filter((k) => !themeSets.includes(k));
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...rest, setsOff }));
  } catch {}
}
