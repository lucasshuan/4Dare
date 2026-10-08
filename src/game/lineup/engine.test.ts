import { describe, expect, it } from "vitest";
import { Game, ident, rng } from "../test-utils";
import {
  GameError,
  type GameEvent,
  type RoomSettings,
  SHOW_TIMING,
} from "../types";
import { toView } from "../view";
import { inPlay, leaderOf } from "./engine";
import { luPlaces, luTotals } from "./places";
import {
  breaksFor,
  LU_CLOCKS,
  LU_FLOORS,
  lotsFor,
  REACT_MAX,
  roundsFor,
  SLATE,
  STICKER_W,
  TILT_MAX,
} from "./rules";
import type { LuCard, LuDeck } from "./types";

const card = (i: number, round = 1): LuCard => ({
  id: `wd-Q${round}${String(i).padStart(3, "0")}`,
  name: `Card ${round}.${i}`,
  origin: "Somewhere",
  imageUrl: `https://img.test/${round}-${i}.png`,
});

/** A round's deck: `lots` cards to auction and `spares` more for empty teams. */
const deck = (lots: number, round = 1, spares = 4): LuDeck => ({
  cards: Array.from({ length: lots + spares }, (_, i) => card(i, round)),
  lots,
  mission: {
    id: `mission-${round}`,
    text: {
      en: `Mission ${round}`,
      es: `Misión ${round}`,
      ja: `ミッション${round}`,
      pt: `Missão ${round}`,
    },
  },
});

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof GameError) return e.code;
    throw e;
  }
  return null;
};

/** A What for? room of `players`, started; the opening is over and lot 1 is open. */
function lineupGame(
  players = 4,
  settings: Partial<RoomSettings> = {},
  seed = 1,
) {
  const g = new Game(players, seed, { game: "lineup", seats: 8, ...settings });
  const s = g.state.settings;
  const lots = lotsFor(players, s.lotsPerSeat);
  const decks = Array.from({ length: roundsFor(players, s.rounds) }, (_, r) =>
    deck(lots, r + 1),
  );
  g.do({ type: "START", playerId: g.state.hostId, decks });
  g.skipReveal();
  return g;
}

const lu = (g: Game) => {
  const m = g.state.lu;
  if (!m) throw new Error("no lineup match");
  return m;
};
const round = (g: Game) => {
  const r = lu(g).rounds.at(-1);
  if (!r) throw new Error("no round");
  return r;
};
const ids = (g: Game) => lu(g).dealt;

/** `by` bids `amount`; everyone else passes (the lot closes), then the next step starts. */
function buy(g: Game, by: string, amount: number) {
  g.do({ type: "BID", playerId: by, amount });
  for (const id of ids(g)) {
    if (g.state.phase !== "bidding" || id === by) continue;
    if (lu(g).passed.includes(id)) continue;
    if ((lu(g).coins[id] ?? 0) <= amount) continue;
    g.do({ type: "FOLD", playerId: id });
  }
  g.skipReveal();
}

/** Everyone passes the lot: nobody wants it. */
function passAll(g: Game) {
  for (const id of ids(g)) {
    if (g.state.phase !== "bidding") break;
    g.do({ type: "FOLD", playerId: id });
  }
  g.skipReveal();
}

/** Everyone is done with this step (the break, trades, board or score). */
function doneAll(g: Game) {
  const phase = g.state.phase;
  for (const id of ids(g)) {
    if (g.state.phase !== phase) break;
    g.do({ type: "DONE", playerId: id, done: true });
  }
  g.skipReveal();
}

/** Plays the auction out: the first player buys lot 1 for 1, then everyone passes the rest (breaks skipped). */
function runAuction(g: Game) {
  while (g.state.phase === "bidding" || g.state.phase === "halftime") {
    if (g.state.phase === "halftime") doneAll(g);
    else passAll(g);
  }
}

/** From the end of the auction to the vote: no trades, boards as they came, every board on stage. */
function toJudging(g: Game) {
  runAuction(g);
  if (g.state.phase === "trading") doneAll(g);
  if (g.state.phase === "defending") doneAll(g);
  while (g.state.phase === "presenting") {
    const owner = round(g).order[lu(g).showing];
    g.do({ type: "PRESENTED", playerId: owner });
    g.skipReveal();
  }
}

describe("what for?: the start", () => {
  it("deals every round's deck and plays the opening before the first lot", () => {
    const g = new Game(4, 1, { game: "lineup", seats: 8 });
    // two rounds up to four players, fifteen lots each
    expect(roundsFor(4, null)).toBe(2);
    expect(lotsFor(4, 3)).toBe(15);
    const wrong = [deck(15)];
    expect(
      code(() => g.do({ type: "START", playerId: "p1", decks: wrong })),
    ).toBe("invalid_input");
    expect(code(() => g.do({ type: "START", playerId: "p1" }))).toBe(
      "invalid_input",
    );
    const start = g.now;
    g.do({ type: "START", playerId: "p1", decks: [deck(15), deck(15, 2)] });
    const s = g.state;
    expect(s.phase).toBe("bidding");
    expect(s.round).toBe(1);
    expect(lu(g).coins).toEqual({ p1: 10, p2: 10, p3: 10, p4: 10 });
    expect(lu(g).lot).toBe(0);
    expect(s.reveal?.kind).toBe("opening");
    expect(s.reveal?.beats?.map((b) => b.kind)).toEqual([
      "curtain",
      "rules",
      "secret",
      "entrance",
    ]);
    // the lot's clock waits for the opening
    expect(s.stepStartsAt).toBe(s.reveal?.until);
    expect(s.deadline).toBe((s.reveal?.until ?? 0) + 60_000);
    expect(s.playStartedAt).toBe(s.reveal?.until);
    expect(s.stepStartsAt).toBeGreaterThan(start);
    expect(code(() => g.do({ type: "BID", playerId: "p2", amount: 1 }))).toBe(
      "too_early",
    );
  });

  it("decides the rounds and lots by the table, within the room's rules", () => {
    expect(roundsFor(5, null)).toBe(1);
    expect(roundsFor(8, 3)).toBe(3);
    expect(lotsFor(2, 3)).toBe(9);
    expect(lotsFor(8, 3)).toBe(24);
    expect(lotsFor(8, 4)).toBe(24);
    expect(breaksFor(15, true)).toEqual([6]);
    expect(breaksFor(9, true)).toEqual([3]);
    expect(breaksFor(24, true)).toEqual([7, 15]);
    expect(breaksFor(15, false)).toEqual([]);
  });

  it("keeps the room's own rules in check", () => {
    const g = new Game(2, 1, { game: "lineup", seats: 8 });
    const set = (settings: Record<string, unknown>) =>
      code(() => g.do({ type: "UPDATE_SETTINGS", playerId: "p1", settings }));
    expect(set({ coins: 4 })).toBe("invalid_input");
    expect(set({ coins: 21 })).toBe("invalid_input");
    expect(set({ lotsPerSeat: 5 })).toBe("invalid_input");
    expect(set({ rounds: 4 })).toBe("invalid_input");
    expect(set({ interval: "yes" })).toBe("invalid_input");
    expect(set({ offMissions: ["Not An Id"] })).toBe("invalid_input");
    expect(set({ seats: 9 })).toBe("invalid_input");
    expect(
      set({ coins: 20, rounds: 3, offMissions: ["b", "a", "a"] }),
    ).toBeNull();
    expect(g.state.settings.offMissions).toEqual(["a", "b"]);
  });
});

describe("what for?: the auction", () => {
  it("takes bids by their amount: a late one that no longer tops is refused", () => {
    const g = lineupGame();
    g.do({ type: "BID", playerId: "p2", amount: 2 });
    expect(code(() => g.do({ type: "BID", playerId: "p3", amount: 2 }))).toBe(
      "outbid",
    );
    expect(code(() => g.do({ type: "BID", playerId: "p2", amount: 3 }))).toBe(
      "already_done",
    );
    expect(code(() => g.do({ type: "BID", playerId: "p3", amount: 11 }))).toBe(
      "invalid_input",
    );
    expect(code(() => g.do({ type: "BID", playerId: "p3", amount: 1.5 }))).toBe(
      "invalid_input",
    );
    g.do({ type: "BID", playerId: "p3", amount: 5 });
    expect(leaderOf(lu(g))).toEqual({ id: "p3", price: 5 });
    // the towers stay: the covered bid is still on the table
    expect(lu(g).bids).toEqual({ p2: 2, p3: 5 });
  });

  it("sells when everyone but the leader passed: the leader pays, the card goes to their team", () => {
    const g = lineupGame();
    g.do({ type: "BID", playerId: "p2", amount: 3 });
    g.do({ type: "FOLD", playerId: "p1" });
    g.do({ type: "FOLD", playerId: "p3" });
    expect(g.state.phase).toBe("bidding");
    expect(lu(g).lot).toBe(0);
    // a pass can be taken back with a bid
    g.do({ type: "FOLD", playerId: "p4" });
    expect(lu(g).lot).toBe(1);
    expect(lu(g).coins.p2).toBe(7);
    expect(round(g).hands.p2).toEqual([0]);
    expect(round(g).tags[0]).toEqual({ by: "p2", price: 3 });
    expect(g.state.reveal?.kind).toBe("sold");
    expect(g.state.reveal?.until).toBe(g.now + SHOW_TIMING.lineup.sold);
    // the next lot waits for the hammer's scene
    expect(g.state.stepStartsAt).toBe(g.state.reveal?.until);
  });

  it("lets a pass come back with a bid while the lot is open", () => {
    const g = lineupGame();
    g.do({ type: "FOLD", playerId: "p2" });
    g.do({ type: "BID", playerId: "p2", amount: 1 });
    expect(lu(g).passed).toEqual([]);
    expect(code(() => g.do({ type: "FOLD", playerId: "p2" }))).toBe(
      "invalid_input",
    );
  });

  it("sends a lot nobody wants to the leftovers", () => {
    const g = lineupGame();
    passAll(g);
    expect(round(g).leftovers).toEqual([0]);
    expect(lu(g).lot).toBe(1);
    expect(g.state.reveal?.until).toBe(
      (g.state.reveal?.startsAt ?? 0) + SHOW_TIMING.lineup.unsold,
    );
  });

  it("closes at once on a bid nobody can top", () => {
    const g = lineupGame();
    g.do({ type: "BID", playerId: "p1", amount: 10 });
    expect(lu(g).lot).toBe(1);
    expect(lu(g).coins.p1).toBe(0);
  });

  it("gives a late bid its seconds back", () => {
    const g = lineupGame();
    const end = g.state.deadline ?? 0;
    g.now = end - 2000;
    g.do({ type: "BID", playerId: "p2", amount: 1 });
    expect(g.state.deadline).toBe(g.now + LU_CLOCKS.snipe);
    // a bid with time to spare leaves the clock alone
    const g2 = lineupGame();
    const end2 = g2.state.deadline;
    g2.do({ type: "BID", playerId: "p2", amount: 1 });
    expect(g2.state.deadline).toBe(end2);
  });

  it("sells to the leader when the clock runs out", () => {
    const g = lineupGame();
    g.do({ type: "BID", playerId: "p4", amount: 2 });
    g.timeout();
    expect(round(g).hands.p4).toEqual([0]);
    expect(lu(g).coins.p4).toBe(8);
  });

  it("stops for a break halfway; everyone done brings the next lot", () => {
    const g = lineupGame();
    for (let i = 0; i < 7; i++) passAll(g);
    expect(g.state.phase).toBe("halftime");
    expect(g.state.deadline).toBe(
      (g.state.stepStartsAt ?? 0) + LU_CLOCKS.halftime,
    );
    // each "continue" cuts a share, never below the floor
    g.do({ type: "DONE", playerId: "p1", done: true });
    expect(g.state.deadline).toBe(
      (g.state.stepStartsAt ?? 0) + LU_CLOCKS.halftime - LU_CLOCKS.halftime / 4,
    );
    g.do({ type: "DONE", playerId: "p1", done: false });
    expect(g.state.deadline).toBe(
      (g.state.stepStartsAt ?? 0) + LU_CLOCKS.halftime,
    );
    doneAll(g);
    expect(g.state.phase).toBe("bidding");
    expect(lu(g).lot).toBe(7);
  });

  it("gives a lot only one player can bid on a short clock, and skips the rest when nobody can", () => {
    const g = lineupGame(2, { interval: false });
    g.do({ type: "BID", playerId: "p1", amount: 10 });
    g.skipReveal();
    expect(g.state.deadline).toBe((g.state.stepStartsAt ?? 0) + LU_CLOCKS.lone);
    g.do({ type: "BID", playerId: "p2", amount: 10 });
    // nobody has a coin left: the other seven go to the leftovers
    expect(round(g).leftovers).toEqual([2, 3, 4, 5, 6, 7, 8]);
    expect(g.state.phase).toBe("trading");
  });

  it("gives an empty team a leftover", () => {
    const g = lineupGame(2, { interval: false, lotsPerSeat: 2 });
    passAll(g);
    while (g.state.phase === "bidding") buy(g, "p1", 1);
    const r = round(g);
    expect(r.hands.p2).toEqual([0]);
    expect(r.leftovers).toEqual([]);
    expect(r.tags[0]).toEqual({ by: null, price: 0 });
    expect(r.change).toEqual({ p1: 4, p2: 10 });
    expect(g.state.reveal?.kind).toBe("wrap");
  });

  it("gives an empty team a spare when no lot is left over", () => {
    const g = lineupGame(3, { interval: false, lotsPerSeat: 2 });
    while (g.state.phase === "bidding") buy(g, "p1", 1);
    const r = round(g);
    expect(r.hands.p1).toHaveLength(9);
    expect([...r.hands.p2, ...r.hands.p3]).toEqual([9, 10]);
    expect(r.tags[9]).toEqual({ by: null, price: 0 });
  });
});

describe("what for?: trades and the envelope", () => {
  /** A 3-player round after the auction: p1 has 0 and 1, p2 has 2, p3 has 3. */
  function traded() {
    const g = lineupGame(3, { interval: false });
    buy(g, "p1", 1);
    buy(g, "p1", 1);
    buy(g, "p2", 1);
    buy(g, "p3", 1);
    runAuction(g);
    expect(g.state.phase).toBe("trading");
    return g;
  }

  it("swaps cards when the other accepts, price tags and all", () => {
    const g = traded();
    const r = () => round(g);
    expect(
      code(() =>
        g.do({ type: "OFFER", playerId: "p1", to: "p2", give: [2], get: [0] }),
      ),
    ).toBe("invalid_input");
    g.do({ type: "OFFER", playerId: "p1", to: "p2", give: [0, 1], get: [2] });
    g.do({ type: "OFFER", playerId: "p3", to: "p2", give: [3], get: [2] });
    g.do({ type: "ANSWER_OFFER", playerId: "p2", from: "p1", accept: true });
    expect(r().hands.p1.slice(-1)).toEqual([2]);
    expect(r().hands.p2).toContain(0);
    expect(r().hands.p2).toContain(1);
    expect(r().tags[2]).toEqual({ by: "p2", price: 1 });
    expect(r().trades).toHaveLength(1);
    // p3's offer counted on card 2, which moved
    expect(lu(g).offers).toEqual([]);
  });

  it("opens the envelope once everyone is done and no offer is open", () => {
    const g = traded();
    g.do({ type: "OFFER", playerId: "p1", to: "p2", give: [0], get: [2] });
    doneAll(g);
    expect(g.state.phase).toBe("trading");
    // the open offer holds the step, everyone done or not
    expect(lu(g).done).toHaveLength(3);
    g.do({ type: "ANSWER_OFFER", playerId: "p2", from: "p1", accept: false });
    expect(g.state.phase).toBe("defending");
    expect(g.state.reveal?.kind).toBe("envelope");
  });

  it("keeps the mission out of every view until the envelope", () => {
    const g = traded();
    const view = () => toView(g.state, 1, "p2", g.now, "pt").lu;
    expect(view()?.mission).toBeNull();
    g.timeout();
    expect(g.state.phase).toBe("defending");
    expect(view()?.mission?.text.pt).toBe("Missão 1");
  });
});

describe("what for?: boards, stage and vote", () => {
  it("keeps a board inside the slate, with only the owner's cards", () => {
    const g = lineupGame(2, { interval: false, trades: false });
    buy(g, "p1", 1);
    runAuction(g);
    expect(g.state.phase).toBe("defending");
    const hand = round(g).hands.p1;
    g.do({
      type: "BOARD",
      playerId: "p1",
      board: {
        name: "  The   best team in the whole wide world  ",
        stickers: [
          { c: hand[0], x: -50, y: 9999, w: 999, r: 90 },
          { c: hand[0], x: 10, y: 10, w: 10, r: 0 },
          { c: 999, x: 10, y: 10, w: 100, r: 0 },
        ],
        texts: [
          { t: "  one\n\n two \nthree\nfour ", x: 400, y: -3, s: 99, r: -99 },
        ],
      },
    });
    const b = round(g).boards.p1;
    expect(b.name).toBe("The best team in the whole w");
    expect(b.stickers).toEqual([
      {
        c: hand[0],
        x: STICKER_W.max / 2,
        y: SLATE.h - (STICKER_W.max * 1.25) / 2,
        w: STICKER_W.max,
        r: TILT_MAX,
      },
    ]);
    expect(b.texts).toEqual([
      { t: "one\n\ntwo", x: SLATE.w, y: 0, s: 40, r: -TILT_MAX },
    ]);
    expect(
      code(() =>
        g.do({ type: "BOARD", playerId: "p1", board: { stickers: 1 } }),
      ),
    ).toBe("invalid_input");
    // nobody else sees it before the stage
    expect(toView(g.state, 1, "p2", g.now, "pt").lu?.boards.p1).toBeUndefined();
    expect(toView(g.state, 1, "p1", g.now, "pt").lu?.boards.p1.name).toBe(
      "The best team in the whole w",
    );
    // the clock's floor
    g.do({ type: "DONE", playerId: "p1", done: true });
    expect(g.state.deadline).toBeGreaterThanOrEqual(
      g.now + LU_FLOORS.defending,
    );
  });

  it("puts each board on stage; only its owner ends it, the others react up to the cap", () => {
    const g = lineupGame(3, { interval: false, trades: false });
    runAuction(g);
    doneAll(g);
    expect(g.state.phase).toBe("presenting");
    const order = round(g).order;
    expect([...order].sort()).toEqual(["p1", "p2", "p3"]);
    const owner = order[0];
    const other = order[1];
    expect(code(() => g.do({ type: "PRESENTED", playerId: other }))).toBe(
      "not_your_turn",
    );
    expect(
      code(() =>
        g.do({ type: "REACT", playerId: owner, counts: [1, 0, 0, 0] }),
      ),
    ).toBe("invalid_input");
    g.do({ type: "REACT", playerId: other, counts: [6, 0, 0, 0] });
    g.do({ type: "REACT", playerId: other, counts: [3, 3, 0, 0] });
    expect(round(g).reactions[owner][other]).toEqual([9, 1, 0, 0]);
    expect(toView(g.state, 1, other, g.now, "pt").lu?.reactLeft).toBe(0);
    expect(REACT_MAX).toBe(10);
    // the next board waits its turn: boards appear as they go on stage
    expect(
      Object.keys(toView(g.state, 1, other, g.now, "pt").lu?.boards ?? {}),
    ).toEqual([owner]);
    g.do({ type: "PRESENTED", playerId: owner });
    expect(lu(g).showing).toBe(1);
    g.timeout();
    expect(lu(g).showing).toBe(2);
    g.timeout();
    expect(g.state.phase).toBe("judging");
  });

  it("keeps votes secret until the tally, then scores: a point a vote, two for the winner", () => {
    const g = lineupGame(3, { interval: false, trades: false });
    toJudging(g);
    g.do({ type: "JUDGE", playerId: "p1", ownerId: "p2" });
    const v = toView(g.state, 1, "p3", g.now, "pt").lu?.vote;
    expect(v).toEqual({ votedIds: ["p1"], yours: null, votes: null });
    g.do({ type: "JUDGE", playerId: "p2", ownerId: "p2" });
    g.do({ type: "JUDGE", playerId: "p3", ownerId: "p1" });
    expect(g.state.phase).toBe("scoring");
    expect(g.state.reveal?.kind).toBe("tally");
    expect(round(g).winners).toEqual(["p2"]);
    expect(round(g).points).toEqual({ p1: 1, p2: 4, p3: 0 });
    expect(toView(g.state, 1, "p3", g.now, "pt").lu?.vote?.votes).toEqual({
      p1: "p2",
      p2: "p2",
      p3: "p1",
    });
  });

  it("breaks a tie only with those who voted outside it", () => {
    const g = lineupGame(5, { interval: false, trades: false });
    toJudging(g);
    // p1 2, p2 2, p3 1
    const votes: [string, string][] = [
      ["p1", "p1"],
      ["p2", "p1"],
      ["p3", "p2"],
      ["p4", "p2"],
      ["p5", "p3"],
    ];
    for (const [by, owner] of votes)
      g.do({ type: "JUDGE", playerId: by, ownerId: owner });
    expect(g.state.phase).toBe("tiebreak");
    expect(round(g).tie).toEqual({
      among: ["p1", "p2"],
      voters: ["p5"],
      votes: {},
    });
    g.skipReveal();
    expect(
      code(() => g.do({ type: "JUDGE", playerId: "p1", ownerId: "p2" })),
    ).toBe("not_your_turn");
    expect(
      code(() => g.do({ type: "JUDGE", playerId: "p5", ownerId: "p3" })),
    ).toBe("invalid_input");
    g.do({ type: "JUDGE", playerId: "p5", ownerId: "p2" });
    expect(g.state.phase).toBe("scoring");
    expect(round(g).winners).toEqual(["p2"]);
    // the tiebreak decides, it gives no points
    expect(round(g).points).toEqual({ p1: 2, p2: 4, p3: 1, p4: 0, p5: 0 });
  });

  it("lets a tie stand when every vote went to the tied boards", () => {
    const g = lineupGame(4, { interval: false, trades: false });
    toJudging(g);
    const votes: [string, string][] = [
      ["p1", "p1"],
      ["p2", "p1"],
      ["p3", "p2"],
      ["p4", "p2"],
    ];
    for (const [by, owner] of votes)
      g.do({ type: "JUDGE", playerId: by, ownerId: owner });
    expect(g.state.phase).toBe("scoring");
    expect(round(g).tie).toBeNull();
    expect(round(g).winners.sort()).toEqual(["p1", "p2"]);
    expect(round(g).points).toEqual({ p1: 4, p2: 4, p3: 0, p4: 0 });
  });

  it("gives the crowd's prize to the board with the most reactions, alone at the top", () => {
    const g = lineupGame(3, { interval: false, trades: false });
    runAuction(g);
    doneAll(g);
    const owner = round(g).order[0];
    const fans = ids(g).filter((id) => id !== owner);
    g.do({ type: "REACT", playerId: fans[0], counts: [2, 1, 0, 0] });
    while (g.state.phase === "presenting") g.timeout();
    for (const id of ids(g)) g.do({ type: "JUDGE", playerId: id, ownerId: id });
    expect(round(g).crowd).toBe(owner);
  });
});

describe("what for?: rounds and the podium", () => {
  it("plays every round with new coins, then ranks by points", () => {
    const g = lineupGame(2, { interval: false, trades: false });
    buy(g, "p1", 4);
    toJudging(g);
    g.do({ type: "JUDGE", playerId: "p1", ownerId: "p1" });
    g.do({ type: "JUDGE", playerId: "p2", ownerId: "p1" });
    g.do({ type: "RATE", playerId: "p2", up: false });
    expect(round(g).rated).toEqual({ p2: -1 });
    g.skipReveal();
    doneAll(g);
    // round 2: the short opening, ten coins again
    expect(lu(g).round).toBe(2);
    expect(g.state.phase).toBe("bidding");
    expect(lu(g).coins).toEqual({ p1: 10, p2: 10 });
    expect(g.state.reveal?.beats?.map((b) => b.kind)).toEqual([
      "round",
      "secret",
      "entrance",
    ]);
    g.skipReveal();
    toJudging(g);
    g.do({ type: "JUDGE", playerId: "p1", ownerId: "p2" });
    g.do({ type: "JUDGE", playerId: "p2", ownerId: "p2" });
    g.skipReveal();
    g.timeout();
    expect(g.state.phase).toBe("finished");
    expect(luTotals(lu(g))).toEqual({ p1: 4, p2: 4 });
    expect(luPlaces(lu(g))).toEqual({ p1: 1, p2: 1 });
    expect(g.state.matches?.[0].players.map((p) => p.place)).toEqual([1, 1]);
    const results = toView(g.state, 1, "p1", g.now, "pt").lu?.results ?? [];
    expect(results.map((r) => r.winners)).toEqual([["p1"], ["p2"]]);
    expect(Object.keys(results[0].boards)).toEqual(["p1"]);
  });

  it("goes on without whoever leaves, and ends below two players", () => {
    const g = lineupGame(3, { interval: false });
    g.do({ type: "BID", playerId: "p1", amount: 2 });
    g.do({ type: "FOLD", playerId: "p2" });
    g.do({ type: "LEAVE", playerId: "p3" });
    // p3 was the last one who could top it
    expect(round(g).hands.p1).toEqual([0]);
    expect(inPlay(g.state)).toEqual(["p1", "p2"]);
    g.skipReveal();
    g.do({ type: "LEAVE", playerId: "p2" });
    expect(g.state.phase).toBe("finished");
  });

  it("follows a guest who signs in, mid-match", () => {
    const g = lineupGame(2, { interval: false });
    g.do({ type: "BID", playerId: "p2", amount: 2 });
    g.do({ type: "SWAP_PLAYER", from: "p2", player: ident("acc-2") });
    expect(lu(g).dealt).toEqual(["p1", "acc-2"]);
    expect(lu(g).bids).toEqual({ "acc-2": 2 });
    g.do({ type: "FOLD", playerId: "p1" });
    expect(round(g).hands["acc-2"]).toEqual([0]);
  });
});

describe("what for?: random play", () => {
  /** Some event any player could send now, or null to let the clock run. */
  function randomEvent(g: Game, random: () => number): GameEvent | null {
    const s = g.state;
    const m = lu(g);
    const here = inPlay(s);
    const who = here[Math.floor(random() * here.length)];
    const r = round(g);
    const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)];
    switch (s.phase) {
      case "bidding": {
        const price = leaderOf(m).price;
        if (random() < 0.5 && m.coins[who] > price)
          return {
            type: "BID",
            playerId: who,
            amount: price + 1 + Math.floor(random() * (m.coins[who] - price)),
          };
        return random() < 0.8 ? { type: "FOLD", playerId: who } : null;
      }
      case "trading": {
        const other = pick(here.filter((id) => id !== who));
        if (random() < 0.4 && r.hands[who].length && r.hands[other]?.length)
          return {
            type: "OFFER",
            playerId: who,
            to: other,
            give: [pick(r.hands[who])],
            get: [pick(r.hands[other])],
          };
        const mine = m.offers.find((o) => o.to === who);
        if (mine)
          return {
            type: "ANSWER_OFFER",
            playerId: who,
            from: mine.from,
            accept: random() < 0.5,
          };
        return { type: "DONE", playerId: who, done: true };
      }
      case "defending":
        if (random() < 0.5)
          return {
            type: "BOARD",
            playerId: who,
            board: {
              name: "Team",
              stickers: r.hands[who].map((c) => ({
                c,
                x: random() * 400,
                y: random() * 600,
                w: 30 + random() * 200,
                r: random() * 140 - 70,
              })),
              texts: [{ t: "hi", x: 100, y: 100, s: 20, r: 0 }],
            },
          };
        return { type: "DONE", playerId: who, done: true };
      case "halftime":
      case "scoring":
        return { type: "DONE", playerId: who, done: true };
      case "presenting": {
        const owner = r.order[m.showing];
        if (who === owner) return { type: "PRESENTED", playerId: who };
        return { type: "REACT", playerId: who, counts: [1, 0, 1, 0] };
      }
      case "judging":
        return {
          type: "JUDGE",
          playerId: who,
          ownerId: pick(m.dealt.filter((id) => r.hands[id]?.length)),
        };
      case "tiebreak": {
        const tie = r.tie;
        if (!tie) return null;
        return {
          type: "JUDGE",
          playerId: pick(tie.voters),
          ownerId: pick(tie.among),
        };
      }
      default:
        return null;
    }
  }

  it("never breaks its own rules, from 2 to 8 players", () => {
    for (let seed = 1; seed <= 28; seed++) {
      const players = 2 + (seed % 7);
      const random = rng(seed * 7919);
      const g = lineupGame(players, { interval: seed % 3 !== 0 }, seed);
      let steps = 0;
      while (g.state.phase !== "finished" && steps < 4000) {
        steps += 1;
        // someone leaves now and then
        if (random() < 0.002 && inPlay(g.state).length > 2)
          g.do({ type: "LEAVE", playerId: inPlay(g.state).at(-1) ?? "" });
        const e = random() < 0.85 ? randomEvent(g, random) : null;
        if (e) {
          g.skipReveal();
          const c = code(() => g.do(e));
          expect(
            c === null ||
              [
                "outbid",
                "already_done",
                "not_your_turn",
                "invalid_input",
              ].includes(c),
            `${g.state.phase} ${e.type} ${c}`,
          ).toBe(true);
        } else g.timeout();
        // the rules that always hold
        const m = lu(g);
        for (const id of m.dealt) expect(m.coins[id]).toBeGreaterThanOrEqual(0);
        const held = Object.values(round(g).hands).flat();
        expect(new Set(held).size).toBe(held.length);
      }
      expect(g.state.phase, `seed ${seed}`).toBe("finished");
      const m = lu(g);
      for (const r of m.rounds) {
        // every team defended something
        for (const id of m.dealt) expect(r.hands[id].length).toBeGreaterThan(0);
        const spent = Object.fromEntries(
          m.dealt.map((id) => [
            id,
            Object.values(r.tags)
              .filter((t) => t.by === id)
              .reduce((a, t) => a + t.price, 0),
          ]),
        );
        for (const id of m.dealt)
          expect(spent[id] + r.change[id]).toBe(g.state.settings.coins);
      }
      // view for everyone at the end
      for (const id of m.dealt)
        expect(toView(g.state, 1, id, g.now, "en").lu?.results).toHaveLength(
          m.rounds.length,
        );
    }
  });
});
