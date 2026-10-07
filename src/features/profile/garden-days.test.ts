import { describe, expect, it } from "vitest";
import { GARDEN_WEEKS, gardenDays, stage, streaks } from "./garden-days";

// Wednesday 7 October 2026, mid-afternoon, in the test's own time zone
const NOW = new Date(2026, 9, 7, 15, 0).getTime();
const at = (month: number, day: number, hour = 12) =>
  new Date(2026, month, day, hour).getTime();
/** The garden's day for a date of 2026 (a year back holds the same day of 2025). */
const dayOf = (
  days: ReturnType<typeof gardenDays>,
  month: number,
  day: number,
) =>
  days.findIndex(
    (d) => d.date.getTime() === new Date(2026, month, day).getTime(),
  );
const play = (ms: number, won = false) => ({
  at: ms,
  game: "who-am-i" as const,
  won,
});

describe("the garden", () => {
  it("lays 53 weeks from a Monday, this week's last days still to come", () => {
    const days = gardenDays([], NOW);
    expect(days).toHaveLength(GARDEN_WEEKS * 7);
    expect(days[0].date.getDay()).toBe(1);
    const today = dayOf(days, 9, 7);
    expect(today).toBe(days.length - 5);
    expect(days[today].future).toBe(false);
    expect(days[today + 1].future).toBe(true);
  });

  it("counts each day's matches, wins and games, late at night included", () => {
    const days = gardenDays(
      [play(at(9, 6, 23), true), play(at(9, 6, 1)), play(at(9, 7))],
      NOW,
    );
    const sixth = days[dayOf(days, 9, 6)];
    expect(sixth).toMatchObject({
      matches: 2,
      wins: 1,
      games: { "who-am-i": 2 },
    });
  });

  it("grows a sprout, a leaf, a bud and a flower", () => {
    expect([0, 1, 2, 3, 4, 6, 7, 20].map(stage)).toEqual([
      0, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });

  it("keeps a streak going until today is over, and finds the longest", () => {
    const plays = [
      play(at(9, 4)),
      play(at(9, 5)),
      play(at(9, 6)),
      play(at(9, 6, 20)),
      // a longer one in July
      ...[10, 11, 12, 13, 14].map((d) => play(at(6, d))),
    ];
    expect(streaks(plays, NOW)).toEqual({
      current: 3,
      best: 5,
      bestEnd: new Date(2026, 6, 14).getTime(),
    });
    expect(streaks([...plays, play(at(9, 7))], NOW).current).toBe(4);
    expect(streaks([play(at(9, 1))], NOW).current).toBe(0);
  });
});
