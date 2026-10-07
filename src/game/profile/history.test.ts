import { describe, expect, it } from "vitest";
import {
  factsOf,
  type PlayedMatch,
  totalsOf,
  type WhoAmIPart,
  whoAmINumbers,
} from "./history";

const THEME = {
  en: "Villains",
  es: "Villanos",
  ja: "悪役",
  pt: "Vilões",
  set: null,
};

let n = 0;
function match(
  part: Partial<WhoAmIPart> = {},
  fields: Partial<PlayedMatch> = {},
): PlayedMatch {
  n += 1;
  return {
    matchId: `m${n}`,
    game: "who-am-i",
    finishedAt: n * 1000,
    place: null,
    timeMs: 60_000,
    xp: 10,
    others: [],
    details: {
      themeId: null,
      theme: null,
      result: "gave_up",
      questions: 5,
      guesses: 1,
      discoveredAt: null,
      characterId: null,
      characterName: null,
      pickedBy: null,
      gave: null,
      ...part,
    },
    ...fields,
  };
}

describe("a profile's matches", () => {
  it("adds up matches, wins, time and XP", () => {
    const rows = [
      match({}, { place: 1, xp: 35 }),
      match({}, { timeMs: null }),
      match(),
    ];
    expect(totalsOf(rows)).toEqual({
      matches: 3,
      wins: 1,
      timeMs: 120_000,
      xp: 55,
    });
  });

  it("counts discoveries among the matches played to the end", () => {
    const rows = [
      match({ result: "discovered", questions: 4 }),
      match({ result: "discovered", questions: 8 }),
      match({ result: "gave_up" }),
      match({ result: "left" }),
    ];
    expect(whoAmINumbers(rows)).toEqual({
      discovered: 2,
      discoverRate: 2 / 3,
      avgQuestions: 6,
      bestQuestions: 4,
    });
    expect(whoAmINumbers([]).discoverRate).toBeNull();
  });

  it("finds the partner, the fastest discovery, the hardest card and the theme", () => {
    const bia = { id: "bia", place: 2, guest: false };
    const guest = { id: "g1", place: null, guest: true };
    const rows = [
      match(
        { result: "discovered", discoveredAt: 3, characterName: "Mario" },
        { place: 1, others: [bia, guest] },
      ),
      match(
        {
          result: "discovered",
          discoveredAt: 1,
          characterName: "Pikachu",
          themeId: "villains",
          theme: THEME,
          gave: {
            to: "bia",
            characterId: "x",
            characterName: "Sherlock",
            result: "gave_up",
            questions: 14,
          },
        },
        { place: 2, others: [{ ...bia, place: 1 }] },
      ),
      match(
        {
          themeId: "villains",
          theme: THEME,
          gave: {
            to: "g1",
            characterId: "y",
            characterName: "Totoro",
            result: "not_found",
            questions: 9,
          },
        },
        { others: [bia, guest] },
      ),
    ];
    expect(factsOf(rows)).toEqual([
      { kind: "partner", game: null, id: "bia", together: 3, ahead: 1 },
      {
        kind: "fastest",
        game: "who-am-i",
        characterName: "Pikachu",
        at: 1,
        timeMs: 60_000,
      },
      {
        kind: "hardest",
        game: "who-am-i",
        characterName: "Sherlock",
        questions: 14,
        to: "bia",
      },
      { kind: "theme", game: "who-am-i", theme: THEME, count: 2 },
    ]);
  });

  it("tells nothing from one match with guests", () => {
    expect(
      factsOf([match({}, { others: [{ id: "g", place: 1, guest: true }] })]),
    ).toEqual([]);
  });
});
