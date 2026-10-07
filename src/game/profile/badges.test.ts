import { describe, expect, it } from "vitest";
import { badgeValues, tierKey, tierOf } from "./badges";
import type { PlayedMatch, WhoAmIPart } from "./history";

const DAY = 86_400_000;
const part = (fields: Partial<WhoAmIPart> = {}): WhoAmIPart => ({
  themeId: null,
  theme: null,
  result: "gave_up",
  questions: 5,
  guesses: 0,
  discoveredAt: null,
  characterId: null,
  characterName: null,
  pickedBy: null,
  gave: null,
  ...fields,
});
const match = (
  day: number,
  fields: Partial<PlayedMatch> = {},
  details: Partial<WhoAmIPart> = {},
): PlayedMatch => ({
  matchId: `m${day}-${Math.random()}`,
  game: "who-am-i",
  finishedAt: day * DAY + 3_600_000,
  place: null,
  timeMs: 1,
  xp: 10,
  others: [{ id: "bia", place: null, guest: false }],
  details: part(details),
  ...fields,
});

describe("badges", () => {
  it("counts what each badge asks for", () => {
    const gave = {
      to: "bia",
      characterId: "x",
      characterName: "Sherlock",
      result: "gave_up" as const,
      questions: 14,
    };
    const values = badgeValues(
      [
        match(
          10,
          { place: 1 },
          { result: "discovered", questions: 2, themeId: "a" },
        ),
        match(
          11,
          {},
          { result: "discovered", questions: 7, themeId: "b", gave },
        ),
        match(
          12,
          { others: [{ id: "g1", place: 1, guest: true }] },
          { themeId: "a" },
        ),
        match(20),
      ],
      { pictures: 4, covers: 1, characters: 0 },
    );
    expect(values).toEqual({
      matches: 4,
      wins: 1,
      streak: 3,
      people: 2,
      discovered: 2,
      quick: 1,
      themes: 2,
      tough: 1,
      pictures: 4,
      covers: 1,
      characters: 0,
    });
  });

  it("reaches bronze, silver and gold, and names the next goal", () => {
    const goals = [10, 100, 500];
    expect(tierOf(goals, 3)).toEqual({ tier: 0, next: 10 });
    expect(tierOf(goals, 10)).toEqual({ tier: 1, next: 100 });
    expect(tierOf(goals, 499)).toEqual({ tier: 2, next: 500 });
    expect(tierOf(goals, 900)).toEqual({ tier: 3, next: null });
    expect(tierKey("matches", 2)).toBe("matches.silver");
  });
});
