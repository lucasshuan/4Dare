import { describe, expect, it } from "vitest";
import {
  type ImpostorPart,
  impostorNumbers,
  type PlayedMatch,
  totalsOf,
  type WhoAmIPart,
  whoAmINumbers,
} from "./history";

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

  it("counts the Impostor's numbers", () => {
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
    // "Who am I?"'s numbers leave the Impostor's matches out
    expect(whoAmINumbers(rows).discoverRate).toBeNull();
  });
});
