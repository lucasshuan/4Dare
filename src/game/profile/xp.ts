// XP: what a match gives, and the level a total reaches. One level for the
// whole account; every game gives the same base and adds its own feats.
// Migration 0030 gave the matches played before there was XP these numbers.
import type { GameKey } from "../games";

/** What every game gives: finishing (not leaving), first place, the day's first match. */
export const XP = { finish: 10, first: 15, dayFirst: 5 } as const;

/** What each game adds for its own feats. */
export const GAME_XP = {
  "who-am-i": { discovered: 10 },
  /** A vote on an impostor that sent them out; each round an impostor stayed in. */
  impostor: { rightVote: 5, survived: 10 },
} as const satisfies Record<GameKey, Record<string, number>>;

/** XP from one level to the next: 100 to reach level 2, 50 more each level after. */
export const levelCost = (level: number) => 50 * (level + 1);

/** The level a total reaches, the XP into it and what the next one costs. */
export function levelOf(total: number): {
  level: number;
  into: number;
  need: number;
} {
  let level = 1;
  let left = Math.max(0, Math.floor(total));
  while (left >= levelCost(level)) {
    left -= levelCost(level);
    level += 1;
  }
  return { level, into: left, need: levelCost(level) };
}
