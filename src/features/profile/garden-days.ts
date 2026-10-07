// The garden's days, in the reader's own time zone: 53 weeks of 7, Monday
// first, the last week the current one (its days still to come included).
import type { GameKey } from "@/game/games";

export interface Play {
  at: number;
  game: GameKey;
  won: boolean;
}

export interface GardenDay {
  /** Local midnight. */
  date: Date;
  matches: number;
  wins: number;
  /** Matches per game, for the day's line. */
  games: Partial<Record<GameKey, number>>;
  future: boolean;
}

export const GARDEN_WEEKS = 53;

const midnight = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d;
};
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Each of the garden's days with what was played in it, oldest first. */
export function gardenDays(plays: readonly Play[], now: number): GardenDay[] {
  const today = midnight(now);
  const weekday = (today.getDay() + 6) % 7; // Monday = 0
  const start = new Date(today);
  start.setDate(today.getDate() - weekday - (GARDEN_WEEKS - 1) * 7);
  const byDay = new Map<string, GardenDay>();
  const days: GardenDay[] = [];
  for (let i = 0; i < GARDEN_WEEKS * 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const day = {
      date,
      matches: 0,
      wins: 0,
      games: {},
      future: date > today,
    } satisfies GardenDay;
    days.push(day);
    byDay.set(key(date), day);
  }
  for (const p of plays) {
    const day = byDay.get(key(midnight(p.at)));
    if (!day) continue;
    day.matches += 1;
    if (p.won) day.wins += 1;
    day.games[p.game] = (day.games[p.game] ?? 0) + 1;
  }
  return days;
}

/** The garden's stage for a day: nothing, sprout (1), leaf (2–3), bud (4–6), flower (7+). */
export const stage = (matches: number) =>
  matches === 0
    ? 0
    : matches === 1
      ? 1
      : matches <= 3
        ? 2
        : matches <= 6
          ? 3
          : 4;

/**
 * Days in a row with a match: the run going on now (it may still be
 * yesterday's, today can still come) and the longest, with the day it ended.
 */
export function streaks(plays: readonly Play[], now: number) {
  const played = new Set(plays.map((p) => key(midnight(p.at))));
  const day = midnight(now);
  if (!played.has(key(day))) day.setDate(day.getDate() - 1);
  let current = 0;
  while (played.has(key(day))) {
    current += 1;
    day.setDate(day.getDate() - 1);
  }
  const sorted = [...new Set(plays.map((p) => midnight(p.at).getTime()))].sort(
    (a, b) => a - b,
  );
  let best = 0;
  let bestEnd: number | null = null;
  let run = 0;
  let last: Date | null = null;
  for (const ms of sorted) {
    const d = new Date(ms);
    const next = last ? new Date(last) : null;
    next?.setDate(next.getDate() + 1);
    run = next && key(next) === key(d) ? run + 1 : 1;
    if (run > best) {
      best = run;
      bestEnd = ms;
    }
    last = d;
  }
  return { current, best, bestEnd };
}
