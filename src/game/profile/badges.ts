// Badges: what a player did, in three tiers each (bronze, silver, gold).
// Worked out from their matches and contributions whenever a profile is
// read; the day a tier was first seen is kept (table user_badges).
import type { GameKey } from "../games";
import { impostorParts, type PlayedMatch } from "./history";

export const TIERS = ["bronze", "silver", "gold"] as const;

/** Where a badge shows on the profile: every game's, a game's own, the library's. */
export type BadgeGroup = "general" | GameKey | "library";

export interface BadgeRule {
  id: string;
  group: BadgeGroup;
  /** Bronze, silver and gold, in the badge's own unit. */
  goals: readonly [number, number, number];
}

export const BADGES = [
  { id: "matches", group: "general", goals: [10, 100, 500] },
  { id: "wins", group: "general", goals: [5, 50, 250] },
  { id: "streak", group: "general", goals: [3, 7, 30] },
  { id: "people", group: "general", goals: [5, 25, 100] },
  { id: "discovered", group: "who-am-i", goals: [10, 100, 500] },
  { id: "quick", group: "who-am-i", goals: [1, 10, 50] },
  { id: "themes", group: "who-am-i", goals: [5, 20, 60] },
  { id: "tough", group: "who-am-i", goals: [3, 20, 100] },
  { id: "pokerFace", group: "impostor", goals: [1, 5, 20] },
  { id: "nose", group: "impostor", goals: [5, 20, 75] },
  { id: "chameleon", group: "impostor", goals: [3, 10, 30] },
  { id: "bullseye", group: "impostor", goals: [1, 5, 20] },
  { id: "pictures", group: "library", goals: [1, 10, 50] },
  { id: "covers", group: "library", goals: [1, 5, 20] },
  { id: "characters", group: "library", goals: [1, 10, 50] },
] as const satisfies readonly BadgeRule[];
export type BadgeId = (typeof BADGES)[number]["id"];

/** A discovery in this many questions or fewer is a quick one. */
export const QUICK_QUESTIONS = 3;

/** What the badges count, besides the matches. */
export interface Contributions {
  /** Pictures sent that everyone sees. */
  pictures: number;
  /** Of those, the ones that are a character's cover now. */
  covers: number;
  characters: number;
}

const utcDay = (ms: number) => Math.floor(ms / 86_400_000);

/** The longest run of days (UTC) with a match. */
function longestStreak(matches: readonly PlayedMatch[]) {
  const days = [...new Set(matches.map((m) => utcDay(m.finishedAt)))].sort(
    (a, b) => a - b,
  );
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** How far a player got on each badge. */
export function badgeValues(
  matches: readonly PlayedMatch[],
  made: Contributions,
): Record<BadgeId, number> {
  const parts = matches.flatMap((m) =>
    m.game === "who-am-i" && m.details ? [m.details] : [],
  );
  const imps = impostorParts(matches).filter((p) => !p.left);
  const escapes = imps.filter((p) => p.impostor && p.won);
  return {
    matches: matches.length,
    wins: matches.filter((m) => m.place === 1).length,
    streak: longestStreak(matches),
    people: new Set(matches.flatMap((m) => m.others.map((o) => o.id))).size,
    discovered: parts.filter((p) => p.result === "discovered").length,
    quick: parts.filter(
      (p) => p.result === "discovered" && p.questions <= QUICK_QUESTIONS,
    ).length,
    themes: new Set(parts.flatMap((p) => (p.themeId ? [p.themeId] : []))).size,
    tough: parts.filter(
      (p) => p.gave && p.gave.result !== "discovered" && p.gave.questions > 0,
    ).length,
    // won as an impostor without taking a single vote
    pokerFace: escapes.filter((p) => p.votesTaken === 0).length,
    // right in the match's first vote
    nose: imps.filter((p) => p.firstRight).length,
    chameleon: escapes.length,
    // the crew's card, guessed on the last chance
    bullseye: imps.filter((p) => p.guessHit).length,
    pictures: made.pictures,
    covers: made.covers,
    characters: made.characters,
  };
}

/** The tier a value reaches (0: none yet) and the next goal (null past gold). */
export function tierOf(goals: readonly number[], value: number) {
  const tier = goals.filter((g) => value >= g).length;
  return { tier, next: goals[tier] ?? null };
}

/** The key a tier is kept under in user_badges: "matches.silver". */
export const tierKey = (id: BadgeId, tier: number) =>
  `${id}.${TIERS[tier - 1]}`;
