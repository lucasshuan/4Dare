import { describe, expect, it } from "vitest";
import {
  factsOf,
  type ImpostorPart,
  impostorNumbers,
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
  fields: Partial<Omit<PlayedMatch, "game" | "details">> = {},
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
        {
          result: "discovered",
          discoveredAt: 3,
          characterName: "Mario",
          themeId: "villains",
          theme: THEME,
        },
        { place: 1, others: [bia, guest] },
      ),
      match(
        {
          result: "discovered",
          discoveredAt: 1,
          characterId: "pt-wd-Q1",
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
        characterId: "pt-wd-Q1",
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
      { kind: "theme", game: "who-am-i", theme: THEME, count: 3 },
    ]);
  });

  it("keeps quiet about what says nothing", () => {
    const bia = { id: "bia", place: 2, guest: false };
    const rows = [
      // the only discovery is not the fastest
      match(
        { result: "discovered", discoveredAt: 4, characterName: "Yor" },
        { others: [bia] },
      ),
      // two questions is not hard, and one who left gave up on the match
      match(
        {
          themeId: "villains",
          theme: THEME,
          gave: {
            to: "bia",
            characterId: "x",
            characterName: "Agent 47",
            result: "not_found",
            questions: 2,
          },
        },
        { others: [bia] },
      ),
      match(
        {
          themeId: "villains",
          theme: THEME,
          gave: {
            to: "bia",
            characterId: "y",
            characterName: "Totoro",
            result: "left",
            questions: 12,
          },
        },
        { others: [{ ...bia, place: null }] },
      ),
    ];
    expect(factsOf(rows)).toEqual([
      { kind: "partner", game: null, id: "bia", together: 3, ahead: 0 },
    ]);
  });

  it("counts the Impostor's numbers and finds its curiosities", () => {
    const imp = (
      fields: Partial<ImpostorPart>,
      place: number | null = null,
    ): PlayedMatch => ({
      ...match({}, { place }),
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
    // newest first, as the profile reads them
    const rows = [
      imp({ impostor: true, votesTaken: 1, characterName: "Sanji" }, 1),
      imp({ rightVotes: 2, firstRight: true }, 1),
      imp({ impostor: true, outRound: 2, guess: "Luffy", guessHit: true }),
      imp({ impostor: true, votesTaken: 3, characterName: "Nami" }, 1),
      imp({ impostor: true, left: true }),
    ];
    expect(impostorNumbers(rows)).toEqual({
      caught: 2,
      firstVote: 1,
      crewMatches: 1,
      asImpostor: 3,
      escapeRate: 2 / 3,
    });
    expect(factsOf(rows)).toEqual([
      { kind: "escape", game: "impostor", characterName: "Sanji", votes: 1 },
      { kind: "bullseye", game: "impostor", guess: "Luffy" },
    ]);
    // "Who am I?"'s numbers leave the Impostor's matches out
    expect(whoAmINumbers(rows).discoverRate).toBeNull();
  });

  it("tells nothing from one match with guests", () => {
    expect(
      factsOf([match({}, { others: [{ id: "g", place: 1, guest: true }] })]),
    ).toEqual([]);
  });
});
