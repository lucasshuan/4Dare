// The stage lab's settings, read from and written to its URL, so any moment of any
// variant is a link (and a screenshot): /en/dev/stage?show=theme&at=1.5&players=3.
import { THEME_SET_KEYS, type ThemeSet } from "@/game/theme-sets";
import type { Lang } from "@/game/types";

/** The moments `at` counts from: the start of each part of a match. */
export const LAB_SHOWS = [
  "lobby",
  "opening",
  "vote",
  "theme",
  "pick",
  "cast",
  "turn",
  "result",
] as const;
export type LabShow = (typeof LAB_SHOWS)[number];

export interface LabParams {
  /** The page's language (from its path, not the query). */
  lang: Lang;
  /** Where `at` counts from: the lobby, a show's start, or a step's clock (vote, pick, turn). */
  show: LabShow;
  /** Seconds from that moment (negative: before it). */
  at: number;
  players: 2 | 3 | 4;
  /** Whose screen it is: their seat, 0 (the host) to players − 1. */
  you: number;
  /** The room's first match (cold open, rule) or a later one ("Round 2"). */
  match: "first" | "later";
  /** First match: ✓✓✗ cards, or the sentence alone. */
  rule: "cards" | "sentence";
  /** The host types the theme instead of a vote. */
  typed: boolean;
  /** The vote ties (the roulette spins). */
  tie: boolean;
  /** The pick clock runs out: drafts and empty cards are filled by the server. */
  timeout: boolean;
  /** The winning theme's set (its glyphs and colour). */
  set: ThemeSet;
  /** The clock runs from `at`; otherwise it stays there. */
  play: boolean;
  /** How fast it runs (1, 0.5, 0.25). */
  speed: number;
  /** Short account names, or long guest names (16 characters in Portuguese). */
  names: "short" | "long";
  theme: "light" | "dark";
  /** The lab's own controls; off for screenshots. */
  ui: boolean;
  /** The useStageTimeline demo strip. */
  demo: boolean;
  /** Motion's reduced builds (CSS loops follow the system setting). */
  reduced: boolean;
}

export const LAB_DEFAULTS: LabParams = {
  lang: "en",
  show: "opening",
  at: 0,
  players: 4,
  you: 0,
  match: "first",
  rule: "cards",
  typed: false,
  tie: false,
  timeout: false,
  set: "heroes",
  play: false,
  speed: 1,
  names: "short",
  theme: "light",
  ui: true,
  demo: false,
  reduced: false,
};

const SPEEDS = [0.25, 0.5, 1];
type Query = Record<string, string | string[] | undefined>;

/** The lab's settings from a URL query; anything missing or unknown keeps its default. */
export function parseLabParams(query: Query, lang: Lang): LabParams {
  const get = (k: keyof LabParams) => {
    const v = query[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const flag = (k: keyof LabParams) => {
    const v = get(k);
    return v === undefined ? (LAB_DEFAULTS[k] as boolean) : v !== "0";
  };
  const one = <T extends string>(
    k: keyof LabParams,
    options: readonly T[],
  ): T => {
    const v = get(k);
    return options.includes(v as T) ? (v as T) : (LAB_DEFAULTS[k] as T);
  };
  const players = Number(get("players"));
  const n = (players === 2 || players === 3 ? players : 4) as 2 | 3 | 4;
  const you = Math.trunc(Number(get("you")) || 0);
  const at = Number(get("at"));
  const speed = Number(get("speed"));
  return {
    lang,
    show: one("show", LAB_SHOWS),
    at: Number.isFinite(at) ? at : 0,
    players: n,
    you: Math.min(n - 1, Math.max(0, you)),
    match: one("match", ["first", "later"]),
    rule: one("rule", ["cards", "sentence"]),
    typed: flag("typed"),
    tie: flag("tie"),
    timeout: flag("timeout"),
    set: one("set", THEME_SET_KEYS),
    play: flag("play"),
    speed: SPEEDS.includes(speed) ? speed : 1,
    names: one("names", ["short", "long"]),
    theme: one("theme", ["light", "dark"]),
    ui: flag("ui"),
    demo: flag("demo"),
    reduced: flag("reduced"),
  };
}

/** The URL query for these settings, leaving out the defaults. */
export function labSearch(params: LabParams): string {
  const out = new URLSearchParams();
  for (const k of Object.keys(LAB_DEFAULTS) as (keyof LabParams)[]) {
    const v = params[k];
    if (k === "lang" || v === LAB_DEFAULTS[k]) continue;
    out.set(
      k,
      typeof v === "boolean"
        ? v
          ? "1"
          : "0"
        : typeof v === "number"
          ? String(Math.round(v * 100) / 100)
          : v,
    );
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}
