import { describe, expect, it } from "vitest";
import { badgeValues, tierKey, tierOf } from "./badges";
import {
  type ImpostorPart,
  type LineupRoundStat,
  lineupNumbers,
  type PlayedMatch,
  type WhoAmIPart,
} from "./history";

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
  fields: Partial<Omit<PlayedMatch, "game" | "details">> = {},
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
      pokerFace: 0,
      nose: 0,
      chameleon: 0,
      bullseye: 0,
      coach: 0,
      bargain: 0,
      allIn: 0,
      stage: 0,
      pictures: 4,
      covers: 1,
      characters: 0,
    });
  });

  it("counts the Impostor's: clean escapes, right first votes, escapes and last-chance hits", () => {
    const imp = (
      day: number,
      place: number | null,
      fields: Partial<ImpostorPart>,
    ): PlayedMatch => ({
      ...match(day, { place }),
      game: "impostor",
      details: {
        themeId: null,
        theme: null,
        impostor: false,
        outRound: null,
        left: false,
        rightVotes: 0,
        firstRight: false,
        votesTaken: 0,
        guess: null,
        guessHit: null,
        characterName: "Zoro",
        ...fields,
      },
    });
    const values = badgeValues(
      [
        imp(1, 1, { impostor: true }),
        imp(2, 1, { impostor: true, votesTaken: 2 }),
        imp(3, null, { impostor: true, outRound: 1, guessHit: true }),
        imp(4, 1, { rightVotes: 1, firstRight: true }),
        // leaving counts for nothing
        imp(5, 1, { impostor: true, left: true }),
      ],
      { pictures: 0, covers: 0, characters: 0 },
    );
    expect(values).toMatchObject({
      pokerFace: 1,
      nose: 1,
      chameleon: 2,
      bullseye: 1,
      discovered: 0,
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

describe("badges: what for?", () => {
  const round = (fields: Partial<LineupRoundStat> = {}): LineupRoundStat => ({
    round: 1,
    missionId: "tire-rain",
    spent: 8,
    topPrice: 4,
    votes: 1,
    tieVotes: null,
    laughs: 0,
    won: false,
    crowd: false,
    points: 1,
    cards: 3,
    ...fields,
  });
  const lineupMatch = (rounds: LineupRoundStat[]): PlayedMatch => ({
    matchId: `l-${Math.random()}`,
    game: "lineup",
    finishedAt: DAY,
    place: null,
    timeMs: 1,
    xp: 10,
    others: [],
    details: { rounds },
  });

  it("counts rounds won, cheap wins, all-in buys and crowd prizes", () => {
    const values = badgeValues(
      [
        lineupMatch([
          round({ won: true, spent: 4 }),
          round({ won: true, spent: 9, topPrice: 10, crowd: true }),
        ]),
        lineupMatch([round({ topPrice: 12 }), round({ won: false, spent: 1 })]),
      ],
      { pictures: 0, covers: 0, characters: 0 },
    );
    expect(values.coach).toBe(2);
    expect(values.bargain).toBe(1);
    expect(values.allIn).toBe(2);
    expect(values.stage).toBe(1);
  });

  it("adds the rounds up into the game's numbers", () => {
    const numbers = lineupNumbers([
      lineupMatch([
        round({ won: true, votes: 2, tieVotes: 1, spent: 6 }),
        round({ votes: 0, spent: 10, crowd: true }),
      ]),
    ]);
    expect(numbers).toEqual({
      rounds: 2,
      roundsWon: 1,
      votes: 3,
      crowd: 1,
      avgSpent: 8,
    });
  });
});
