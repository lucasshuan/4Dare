// Gostos: where a character is known. A room turns some off, and its themes
// lose those characters; a theme left with too few is not offered. The names
// people read live in messages/<lang>/common.json (gostos).
import type { Category } from "./categories";
import type { GameKey } from "./games";

export const GOSTOS = [
  { key: "anime", emoji: "🍥" },
  { key: "animation", emoji: "🧸" },
  { key: "live", emoji: "🎬" },
  { key: "games", emoji: "🎮" },
  { key: "comics", emoji: "🦸" },
  { key: "books", emoji: "📚" },
  { key: "faith", emoji: "🕊️" },
  { key: "real", emoji: "⭐" },
] as const;

export type Gosto = (typeof GOSTOS)[number]["key"];

export const GOSTO_KEYS: readonly Gosto[] = GOSTOS.map((g) => g.key);

export const isGosto = (key: unknown): key is Gosto =>
  (GOSTO_KEYS as readonly unknown[]).includes(key);

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
 * is a real person, then the category. Null: no gosto yet, so it filters
 * nothing. Mirrors gostos_by_rule in supabase/migrations/0032.
 */
export function gostosByRule(
  origin: string | null,
  category: Category | null,
): Gosto[] | null {
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

/** A character shows while any of its gostos is on; one with none always shows. */
export function gostoAllowed(
  gostos: readonly Gosto[] | null | undefined,
  off: readonly Gosto[],
): boolean {
  if (!gostos?.length || !off.length) return true;
  return gostos.some((g) => !off.includes(g));
}

/**
 * How many of a theme's starters must stay for the theme to be offered (all
 * of them when it has fewer). Starters are the theme's clearest fits.
 */
export const THEME_MIN_STARTERS = 3;

/** A theme stays while enough of its starters keep a gosto that is on. */
export function themeAllowed(
  starterGostos: readonly (readonly Gosto[] | null)[],
  off: readonly Gosto[],
): boolean {
  if (!off.length || !starterGostos.length) return true;
  const kept = starterGostos.filter((g) => gostoAllowed(g, off)).length;
  return kept >= Math.min(THEME_MIN_STARTERS, starterGostos.length);
}

/** What a room lets into its theme draws. */
export interface ThemeFilter {
  game: GameKey;
  offGostos: readonly Gosto[];
  offThemes: readonly string[];
}

/** The room lets the theme in: its game, not switched off, and enough of it left by the gostos. */
export function letsIn(
  t: {
    id: string;
    games: readonly GameKey[];
    gostos: readonly (readonly Gosto[] | null)[];
  },
  filter: ThemeFilter,
): boolean {
  return (
    t.games.includes(filter.game) &&
    !filter.offThemes.includes(t.id) &&
    themeAllowed(t.gostos, filter.offGostos)
  );
}
