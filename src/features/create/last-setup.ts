// The last room setup, so the next room starts the same way. Kept in this browser only.
import { THEME_SET_KEYS } from "@/game/theme-sets";
import {
  DEFAULT_SETTINGS,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
} from "@/game/types";
import type { CreateRoomInput } from "@/server/contract";

const KEY = "ludodare:who-am-i:setup";

export const DEFAULT_SETUP: CreateRoomInput = {
  visibility: DEFAULT_SETTINGS.visibility,
  seats: DEFAULT_SETTINGS.seats,
  stepSeconds: DEFAULT_SETTINGS.stepSeconds,
  themeMode: DEFAULT_SETTINGS.themeMode,
  themeSets: [...THEME_SET_KEYS],
};

const oneOf = <T>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

/** The setup saved last, field by field; anything missing or odd falls back to the default. */
export function loadSetup(): CreateRoomInput {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {}
  const d = DEFAULT_SETUP;
  const seconds = saved.stepSeconds;
  // Saved as the sets turned off, so a set added later starts on.
  const off = Array.isArray(saved.setsOff) ? saved.setsOff : [];
  const themeSets = THEME_SET_KEYS.filter((k) => !off.includes(k));
  return {
    visibility: oneOf(saved.visibility, ["public", "private"], d.visibility),
    seats: oneOf(saved.seats, [2, 3, 4], d.seats),
    stepSeconds:
      typeof seconds === "number" &&
      Number.isInteger(seconds) &&
      seconds >= STEP_SECONDS_MIN &&
      seconds <= STEP_SECONDS_MAX
        ? seconds
        : d.stepSeconds,
    themeMode: oneOf(saved.themeMode, ["vote", "host"], d.themeMode),
    themeSets: themeSets.length ? themeSets : d.themeSets,
  };
}

export function saveSetup({ themeSets, ...rest }: CreateRoomInput) {
  const setsOff = THEME_SET_KEYS.filter((k) => !themeSets.includes(k));
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...rest, setsOff }));
  } catch {}
}
