// Presets: a room's advanced setup (clocks, theme mode, tastes, themes)
// under a name, to start the next room the same way. A few come ready (tastes
// only, for any game); a person keeps up to PRESETS_MAX of their own, which
// follow their account (src/game/options.ts). The names people read for the
// ready ones live in messages/<lang>/home.json (presets.ready).
import { type GameKey, isGameKey } from "./games";
import { cleanRules, type LineupRules } from "./lineup/rules";
import { isTaste, TASTE_KEYS, type Taste } from "./tastes";
import {
  DEFAULT_SETTINGS,
  OFF_THEMES_MAX,
  type RoomSettings,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
  STEP_TIMES,
  type StepTime,
} from "./types";

export const PRESETS_MAX = 12;
export const PRESET_NAME_MAX = 30;

/** What a preset keeps: the room's rules, tastes and themes; never its name, password or seats. */
export type PresetSetup = Pick<
  RoomSettings,
  StepTime | "themeMode" | "impostors" | "offTastes" | "offThemes"
> &
  LineupRules;

export interface RoomPreset {
  id: string;
  name: string;
  /** The game it was saved in: its rules only apply there. */
  game: GameKey;
  setup: PresetSetup;
  /** New rooms of its game start from it (one per game). */
  isDefault: boolean;
}

/** The ready ones: only tastes, so any game takes them whole. */
export const READY_PRESETS = [
  { key: "everything", on: TASTE_KEYS },
  { key: "anime", on: ["anime", "animation", "games"] },
  { key: "tv", on: ["animation", "live", "real"] },
  { key: "real", on: ["real"] },
] as const satisfies readonly { key: string; on: readonly Taste[] }[];
export type ReadyPreset = (typeof READY_PRESETS)[number];

export const readyOff = (p: ReadyPreset): Taste[] =>
  TASTE_KEYS.filter((k) => !(p.on as readonly Taste[]).includes(k));

/** The part of a room's setup a preset keeps. */
export function presetSetup(s: PresetSetup): PresetSetup {
  return {
    ...(Object.fromEntries(STEP_TIMES.map((k) => [k, s[k]])) as Pick<
      PresetSetup,
      StepTime
    >),
    themeMode: s.themeMode,
    impostors: s.impostors ?? null,
    offTastes: [...s.offTastes],
    offThemes: [...s.offThemes].sort(),
    ...cleanRules(s as unknown as Record<string, unknown>),
  };
}

/**
 * A room's setup with a preset applied: whole in its own game; in another
 * game, only its tastes and themes (the rules belong to its game).
 */
export function applyPreset<T extends PresetSetup & { game: GameKey }>(
  value: T,
  preset: Pick<RoomPreset, "game" | "setup">,
): T {
  const { setup } = preset;
  const themes = { offTastes: setup.offTastes, offThemes: setup.offThemes };
  return preset.game === value.game
    ? { ...value, ...setup }
    : { ...value, ...themes };
}

/** True when the room's setup is what the preset would make of it. */
export function matchesPreset(
  value: PresetSetup & { game: GameKey },
  preset: Pick<RoomPreset, "game" | "setup">,
): boolean {
  const key = (s: PresetSetup) => JSON.stringify(presetSetup(s));
  return key(applyPreset(value, preset)) === key(value);
}

const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

const seconds = (v: unknown) =>
  typeof v === "number" &&
  Number.isInteger(v) &&
  v >= STEP_SECONDS_MIN &&
  v <= STEP_SECONDS_MAX;

const THEME_ID = /^[a-z0-9-]{1,80}$/;

function parseSetup(raw: unknown): PresetSetup | null {
  // a clock a preset was saved without (a game added later) takes its default
  const r = {
    ...Object.fromEntries(STEP_TIMES.map((k) => [k, DEFAULT_SETTINGS[k]])),
    ...record(raw),
  };
  if (!STEP_TIMES.every((k) => seconds(r[k]))) return null;
  const impostors =
    Number.isInteger(r.impostors) &&
    (r.impostors as number) >= 1 &&
    (r.impostors as number) <= 3
      ? (r.impostors as number)
      : null;
  if (r.themeMode !== "vote" && r.themeMode !== "host") return null;
  const off = Array.isArray(r.offTastes) ? r.offTastes.filter(isTaste) : [];
  const offTastes = TASTE_KEYS.filter((k) => off.includes(k));
  if (offTastes.length === TASTE_KEYS.length) return null;
  const themes = Array.isArray(r.offThemes) ? r.offThemes : [];
  const offThemes = [
    ...new Set(
      themes.filter(
        (t): t is string => typeof t === "string" && THEME_ID.test(t),
      ),
    ),
  ]
    .sort()
    .slice(0, OFF_THEMES_MAX);
  return {
    ...(Object.fromEntries(STEP_TIMES.map((k) => [k, r[k]])) as Pick<
      PresetSetup,
      StepTime
    >),
    themeMode: r.themeMode,
    impostors,
    offTastes,
    offThemes,
    ...cleanRules(r),
  };
}

/** A person's presets read back: odd ones dropped, at most one default per game. */
export function parsePresets(raw: unknown): RoomPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: RoomPreset[] = [];
  const defaults = new Set<GameKey>();
  for (const item of raw) {
    if (out.length === PRESETS_MAX) break;
    const r = record(item);
    const setup = parseSetup(r.setup);
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (
      !setup ||
      !name ||
      [...name].length > PRESET_NAME_MAX ||
      typeof r.id !== "string" ||
      !/^[a-z0-9-]{1,40}$/i.test(r.id) ||
      !isGameKey(r.game) ||
      out.some((p) => p.id === r.id)
    )
      continue;
    const isDefault = r.isDefault === true && !defaults.has(r.game);
    if (isDefault) defaults.add(r.game);
    out.push({ id: r.id, name, game: r.game, setup, isDefault });
  }
  return out;
}

/** The preset new rooms of a game start from, if the person chose one. */
export const defaultPreset = (presets: readonly RoomPreset[], game: GameKey) =>
  presets.find((p) => p.isDefault && p.game === game) ?? null;
