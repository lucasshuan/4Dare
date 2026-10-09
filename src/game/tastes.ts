// Tastes: where a character is known. A room turns some off, and its themes
// lose those characters; a theme left with too few is not offered. The names
// people read live in messages/<lang>/common.json (tastes).
import type { Category } from "./categories";
import type { GameKey } from "./games";

export const TASTES = [
  { key: "anime", emoji: "🍥" },
  { key: "animation", emoji: "🧸" },
  { key: "live", emoji: "🎬" },
  { key: "games", emoji: "🎮" },
  { key: "comics", emoji: "🦸" },
  { key: "books", emoji: "📚" },
  { key: "faith", emoji: "🕊️" },
  { key: "real", emoji: "⭐" },
] as const;

export type Taste = (typeof TASTES)[number]["key"];

export const TASTE_KEYS: readonly Taste[] = TASTES.map((g) => g.key);

export const isTaste = (key: unknown): key is Taste =>
  (TASTE_KEYS as readonly unknown[]).includes(key);

const REAL: readonly Category[] = [
  "sports",
  "music",
  "entertainment",
  "politics",
  "royalty",
  "history",
  "science",
  "art",
  "business",
  "internet",
];

/**
 * The rule for a character nobody decided: AniList is anime, a job or a group
 * is a real person, then the category. Null: no taste yet, so it filters
 * nothing. Mirrors tastes_by_rule in supabase/migrations/0032.
 */
export function tastesByRule(
  origin: string | null,
  category: Category | null,
): Taste[] | null {
  const source = origin?.split(":")[0];
  if (source === "al") return ["anime"];
  if (source === "job" || source === "group") return ["real"];
  if (!category) return null;
  if (category === "anime") return ["anime"];
  if (category === "cartoons") return ["animation"];
  if (category === "film_tv") return ["live"];
  if (category === "games") return ["games"];
  if (category === "comics") return ["comics"];
  if (
    category === "literature" ||
    category === "mythology" ||
    category === "folklore"
  )
    return ["books"];
  if (category === "religion") return ["faith"];
  if (REAL.includes(category)) return ["real"];
  return null;
}

/** A character shows while any of its tastes is on; one with none always shows. */
export function tasteAllowed(
  tastes: readonly Taste[] | null | undefined,
  off: readonly Taste[],
): boolean {
  if (!tastes?.length || !off.length) return true;
  return tastes.some((g) => !off.includes(g));
}

/** The deepest a room reaches into the tastes it keeps (tasteReach). */
export const REACH_MAX = 2.5;

/**
 * How much deeper than usual a room reaches into the tastes it keeps, where
 * a game cuts the library by fame: √(all / kept), at most REACH_MAX. Not in
 * proportion to what it dropped, or the rest would fill with unknowns: a
 * room that only drops real people (two in five of the best known) goes 7%
 * deeper, one with half the tastes 41%, one with only anime 2.5 times.
 */
export function tasteReach(off: readonly Taste[]): number {
  const kept = TASTE_KEYS.filter((g) => !off.includes(g)).length;
  if (!kept) return 1;
  return Math.min(REACH_MAX, Math.sqrt(TASTE_KEYS.length / kept));
}

/**
 * How many of a theme's starters must stay for the theme to be offered (all
 * of them when it has fewer). Starters are the theme's clearest fits.
 */
export const THEME_MIN_STARTERS = 3;

/** A theme stays while enough of its starters keep a taste that is on. */
export function themeAllowed(
  starterTastes: readonly (readonly Taste[] | null)[],
  off: readonly Taste[],
): boolean {
  if (!off.length || !starterTastes.length) return true;
  const kept = starterTastes.filter((g) => tasteAllowed(g, off)).length;
  return kept >= Math.min(THEME_MIN_STARTERS, starterTastes.length);
}

/** What a room lets into its theme draws. */
export interface ThemeFilter {
  game: GameKey;
  offTastes: readonly Taste[];
  offThemes: readonly string[];
}

/** The room lets the theme in: its game, not switched off, and enough of it left by the tastes. */
export function letsIn(
  t: {
    id: string;
    games: readonly GameKey[];
    tastes: readonly (readonly Taste[] | null)[];
  },
  filter: ThemeFilter,
): boolean {
  return (
    t.games.includes(filter.game) &&
    !filter.offThemes.includes(t.id) &&
    themeAllowed(t.tastes, filter.offTastes)
  );
}
