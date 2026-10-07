// The last room setup, so the next room starts the same way. Kept in this browser only.
import { DEFAULT_GAME } from "@/game/games";
import { GOSTO_KEYS, isGosto } from "@/game/gostos";
import {
  DEFAULT_SETTINGS,
  OFF_THEMES_MAX,
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
  offGostos: [],
  offThemes: [],
};

const oneOf = <T>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** What was switched off, as saved: gostos keep their order and one stays on; themes are ids. */
export function cleanOff(gostos: unknown, themes: unknown) {
  const g = Array.isArray(gostos) ? gostos.filter(isGosto) : [];
  const offGostos = GOSTO_KEYS.filter((k) => g.includes(k));
  const offThemes = Array.isArray(themes)
    ? [
        ...new Set(
          themes.filter(
            (t): t is string =>
              typeof t === "string" && /^[a-z0-9-]{1,80}$/.test(t),
          ),
        ),
      ].slice(0, OFF_THEMES_MAX)
    : [];
  return {
    offGostos: offGostos.length === GOSTO_KEYS.length ? [] : offGostos,
    offThemes,
  };
}

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
    // saved as what is switched off, so a gosto or theme added later starts on
    ...cleanOff(saved.offGostos, saved.offThemes),
  };
}

export function saveSetup({
  game: _game,
  name: _name,
  password: _password,
  visibility: _visibility,
  seats: _seats,
  ...rest
}: CreateRoomInput) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {}
}
