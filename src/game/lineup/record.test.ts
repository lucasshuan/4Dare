import { describe, expect, it } from "vitest";
import { GAME_XP, XP } from "../profile/xp";
import { matchRecord } from "../record";
import { Game } from "../test-utils";
import {
  cardCounts,
  lineupPart,
  lineupRounds,
  lineupXp,
  missionCounts,
} from "./record";
import { lotsFor } from "./rules";
import type { LuCard, LuDeck } from "./types";

const card = (i: number): LuCard => ({
  id: `wd-Q${String(i).padStart(3, "0")}`,
  name: `Card ${i}`,
  origin: "Somewhere",
  imageUrl: `https://img.test/${i}.png`,
});

const deck = (lots: number): LuDeck => ({
  cards: Array.from({ length: lots + 4 }, (_, i) => card(i)),
  lots,
  mission: {
    id: "tire-rain",
    text: { en: "Tire", es: "Rueda", ja: "タイヤ", pt: "Pneu" },
  },
});

/**
 * Three players, one round, no break and no trades. p1 buys lot 0 for 3 and
 * lot 2 for 4, p2 lot 1 for 2; nobody wants the rest (p3 gets a leftover).
 * p1 and p2 vote for p1's board, p3 for p2's, and the round is scored.
 */
function playedMatch() {
  const g = new Game(3, 1, {
    game: "lineup",
    seats: 8,
    rounds: 1,
    interval: false,
    trades: false,
  });
  g.do({
    type: "START",
    playerId: g.state.hostId,
    decks: [deck(lotsFor(3, g.state.settings.lotsPerSeat))],
  });
  g.skipReveal();
  const lu = () => {
    const m = g.state.lu;
    if (!m) throw new Error("no lineup match");
    return m;
  };
  const [p1, p2, p3] = lu().dealt;
  const buy = (by: string, amount: number) => {
    g.do({ type: "BID", playerId: by, amount });
    for (const id of lu().dealt)
      if (id !== by && g.state.phase === "bidding")
        g.do({ type: "FOLD", playerId: id });
    g.skipReveal();
  };
  buy(p1, 3);
  buy(p2, 2);
  buy(p1, 4);
  while (g.state.phase === "bidding") {
    for (const id of lu().dealt)
      if (g.state.phase === "bidding") g.do({ type: "FOLD", playerId: id });
    g.skipReveal();
  }
  for (const id of lu().dealt)
    if (g.state.phase === "defending")
      g.do({ type: "DONE", playerId: id, done: true });
  g.skipReveal();
  while (g.state.phase === "presenting") {
    const r = lu().rounds[0];
    g.do({ type: "PRESENTED", playerId: r.order[lu().showing] });
    g.skipReveal();
  }
  g.do({ type: "JUDGE", playerId: p1, ownerId: p1 });
  g.do({ type: "JUDGE", playerId: p2, ownerId: p1 });
  g.do({ type: "JUDGE", playerId: p3, ownerId: p2 });
  g.skipReveal();
  g.do({ type: "RATE", playerId: p2, up: true });
  return { g, lu: lu(), p1, p2, p3 };
}

describe("what for?: the record", () => {
  it("keeps each player's board with what it cost and got", () => {
    const { lu, p1, p2, p3 } = playedMatch();
    const [mine] = lineupPart(lu, p1);
    expect(mine).toMatchObject({
      round: 1,
      spent: 7,
      topPrice: 4,
      votes: 2,
      tieVotes: null,
      won: true,
      crowd: false,
    });
    expect(mine.board.cards.map((c) => [c.id, c.price])).toEqual([
      ["wd-Q000", 3],
      ["wd-Q002", 4],
    ]);
    expect(lineupPart(lu, p2)[0]).toMatchObject({ spent: 2, votes: 1 });
    // a free leftover costs nothing
    expect(lineupPart(lu, p3)[0]).toMatchObject({ spent: 0, votes: 0 });
    expect(lineupPart(lu, p3)[0].board.cards).toHaveLength(1);
  });

  it("gives XP for finishing, first place, rounds won and votes", () => {
    const { lu, p1, p2 } = playedMatch();
    const X = GAME_XP.lineup;
    expect(lineupXp(lineupPart(lu, p1), 1, false)).toBe(
      XP.finish + XP.first + X.roundWon + 2 * X.vote,
    );
    expect(lineupXp(lineupPart(lu, p2), 2, false)).toBe(XP.finish + X.vote);
    expect(lineupXp(lineupPart(lu, p2), 2, true)).toBe(0);
  });

  it("keeps the round's lots in order and counts missions and cards", () => {
    const { lu, p1, p2 } = playedMatch();
    const [r] = lineupRounds(lu);
    expect(r.missionId).toBe("tire-rain");
    expect(r.lots.slice(0, 4)).toEqual([
      { card: "wd-Q000", buyer: p1, price: 3 },
      { card: "wd-Q001", buyer: p2, price: 2 },
      { card: "wd-Q002", buyer: p1, price: 4 },
      { card: "wd-Q003", buyer: null, price: 0 },
    ]);
    expect(missionCounts(lu, "pt")).toEqual([
      {
        id: "tire-rain",
        lang: "pt",
        played: 1,
        liked: 1,
        disliked: 0,
        laughs: 0,
        ties: 0,
      },
    ]);
    const cards = cardCounts(lu, "pt");
    expect(cards.find((c) => c.id === "wd-Q002")).toEqual({
      id: "wd-Q002",
      lang: "pt",
      lots: 1,
      sold: 1,
      price: 4,
      traded: 0,
      won: 1,
    });
    expect(cards.find((c) => c.id === "wd-Q003")).toMatchObject({
      lots: 1,
      sold: 0,
    });
  });

  it("makes the match record with the rounds and every board", () => {
    const { g, p1 } = playedMatch();
    for (const id of g.state.lu?.dealt ?? [])
      if (g.state.phase === "scoring")
        g.do({ type: "DONE", playerId: id, done: true });
    g.skipReveal();
    expect(g.state.phase).toBe("finished");
    const record = matchRecord(g.state, g.now);
    expect(record?.game).toBe("lineup");
    expect(record?.lineup?.rounds).toHaveLength(1);
    const first = record?.players.find((p) => p.userId === p1);
    expect(first).toMatchObject({ place: 1, result: "not_found" });
    expect(first?.lineup?.[0].won).toBe(true);
  });
});
