import { describe, expect, it } from "vitest";
import type { LineupRoundPart } from "../lineup/record";
import type { PlayerRecord } from "../record";
import type { PlayedMatch } from "./history";
import { matchReward, rewardRows } from "./reward";
import { levelOf } from "./xp";

const player = (fields: Partial<PlayerRecord>): PlayerRecord => ({
  userId: "me",
  wasGuest: false,
  lang: "pt",
  pickedById: null,
  pickerLang: null,
  characterId: null,
  characterName: null,
  characterOrigin: null,
  autoPicked: true,
  suggested: false,
  result: "not_found",
  place: null,
  discoveredAt: null,
  questions: 0,
  guesses: 0,
  timeMs: 1,
  xp: 10,
  ...fields,
});

const imp = {
  impostor: false,
  outRound: null,
  left: false,
  rightVotes: 0,
  firstRight: false,
  votesTaken: 0,
  guess: null,
  guessHit: null,
};

const round = (
  n: number,
  fields: { won?: boolean; votes?: number; crowd?: boolean },
) => ({
  round: n,
  board: {} as LineupRoundPart["board"],
  spent: 0,
  topPrice: 0,
  votes: fields.votes ?? 0,
  tieVotes: null,
  laughs: 0,
  won: fields.won ?? false,
  crowd: fields.crowd ?? false,
  points: 0,
});

const total = (rows: { xp: number }[]) => rows.reduce((n, r) => n + r.xp, 0);

describe("the reward card's lines", () => {
  it("add up to the record's XP in every game", () => {
    const who = player({
      result: "discovered",
      place: 1,
      discoveredAt: 2,
      xp: 35,
    });
    expect(rewardRows({ game: "who-am-i" }, who)).toEqual([
      { kind: "finish", xp: 10 },
      { kind: "first", xp: 15 },
      { kind: "discovered", round: 2, xp: 10 },
    ]);
    // an impostor who won, got through two rounds and guessed the crew's card
    const sly = player({
      place: 1,
      xp: 10 + 15 + 20 + 10,
      impostor: { ...imp, impostor: true, guessHit: true },
    });
    const rows = rewardRows({ game: "impostor" }, sly);
    expect(rows.map((r) => r.kind)).toEqual([
      "finish",
      "won",
      "guessHit",
      "survived",
    ]);
    expect(rows.at(-1)).toEqual({ kind: "survived", n: 2, free: true, xp: 20 });
    expect(total(rows)).toBe(sly.xp);
    // the crew: the side that won and its right votes
    const crew = player({
      place: 1,
      xp: 30,
      impostor: { ...imp, rightVotes: 1 },
    });
    expect(total(rewardRows({ game: "impostor" }, crew))).toBe(30);
    const coach = player({
      place: 1,
      xp: 10 + 15 + 15 + 3 * 5 + 5,
      lineup: [
        round(1, { won: true, votes: 3, crowd: true }),
        round(2, { votes: 2 }),
      ],
    });
    const lines = rewardRows({ game: "lineup" }, coach);
    expect(lines).toContainEqual({ kind: "roundWon", round: 1, xp: 15 });
    expect(lines).toContainEqual({ kind: "votes", n: 5, xp: 15 });
    expect(total(lines)).toBe(coach.xp);
  });

  it("gives the presenter their rounds and someone who left nothing", () => {
    const rounds = { rounds: [{}, {}] } as never;
    expect(
      rewardRows(
        { game: "lineup", lineup: rounds },
        player({ role: "host", xp: 20 }),
      ),
    ).toEqual([{ kind: "presented", n: 2, xp: 20 }]);
    expect(
      rewardRows({ game: "who-am-i" }, player({ result: "left", xp: 0 })),
    ).toEqual([]);
  });
});

describe("an account's reward", () => {
  const played = (
    matchId: string,
    xp: number,
    fields: Partial<PlayedMatch> = {},
  ) =>
    ({
      matchId,
      game: "who-am-i",
      finishedAt: 1,
      place: null,
      timeMs: 1,
      xp,
      others: [],
      details: null,
      ...fields,
    }) as PlayedMatch;

  it("takes the day's bonus from the saved match and moves the level on", () => {
    const p = player({ xp: 10 });
    const history = [played("this", 15), played("old", 90)];
    const r = matchReward({ id: "this", game: "who-am-i" }, p, history);
    expect(r.rows.at(-1)).toEqual({ kind: "dayFirst", xp: 5 });
    expect(r.xp).toBe(15);
    expect(r.level).toEqual({ before: levelOf(90), after: levelOf(105) });
    expect(r.level?.after.level).toBe(2);
  });

  it("names a badge tier reached for the first time", () => {
    const old = Array.from({ length: 9 }, (_, i) => played(`m${i}`, 10));
    const r = matchReward({ id: "this", game: "who-am-i" }, player({}), [
      played("this", 10),
      ...old,
    ]);
    expect(r.badge).toEqual({ id: "matches", tier: 1, goal: 10 });
    // a guest: their XP and lines only
    expect(
      matchReward({ id: "this", game: "who-am-i" }, player({}), null),
    ).toEqual({
      rows: [{ kind: "finish", xp: 10 }],
      xp: 10,
      level: null,
      badge: null,
    });
  });
});
