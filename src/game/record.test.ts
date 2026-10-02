import { describe, expect, it } from "vitest";
import { matchRecord } from "./record";
import { Game } from "./test-utils";

describe("match record", () => {
  it("keeps who picked what, how each one ended and how long it took", () => {
    const g = new Game(3, 7);
    g.start();
    expect(matchRecord(g.state, g.now)).toBeNull();
    g.now += 30_000; // picking time is not counted
    g.pickAll();
    const startedAt = g.state.playStartedAt as number;
    expect(startedAt).toBe(g.now);

    // first player: one question, then the right name 20 s in
    g.now += 12_000;
    const first = g.askAndAnswer();
    g.now += 8_000;
    g.do({ type: "GUESS", playerId: first, text: `Name ${first}` });
    const discoveredAt = g.now;

    // second gives up on their turn, third leaves: the match ends
    g.skipReveal();
    g.now += 5_000;
    const second = g.turn;
    g.do({ type: "GIVE_UP", playerId: second });
    g.skipReveal();
    g.now += 5_000;
    const third = g.turn;
    g.do({ type: "LEAVE", playerId: third });
    expect(g.state.phase).toBe("finished");

    const record = matchRecord(g.state, g.now + 1);
    expect(record).toMatchObject({
      id: `ABCDE-${startedAt}`,
      roomCode: "ABCDE",
      round: 1,
      startedAt,
      finishedAt: g.now + 1,
      theme: { pt: "Vilões" },
      themeId: "villains",
    });
    const by = (id: string) => record?.players.find((p) => p.userId === id);
    expect(by(first)).toMatchObject({
      result: "discovered",
      place: 1,
      discoveredAt: 2,
      questions: 1,
      guesses: 1,
      timeMs: discoveredAt - startedAt,
      characterId: `c-${first}`,
      characterName: `Name ${first}`,
      pickedById: g.state.assignments[first].pickerId,
      wasGuest: false,
      lang: "pt",
      autoPicked: false,
    });
    expect(by(second)).toMatchObject({ result: "gave_up", place: null });
    expect(by(second)?.timeMs).toBeGreaterThan(0);
    expect(by(third)).toMatchObject({ result: "left" });
    expect(record?.players).toHaveLength(3);
  });

  it("is null for a match that ended before the questions", () => {
    const g = new Game(2, 3);
    g.start();
    g.do({ type: "LEAVE", playerId: "p2" });
    expect(matchRecord(g.state, g.now)).toBeNull();
  });
});
