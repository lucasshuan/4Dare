import { describe, expect, it } from "vitest";
import { GAME_XP, XP } from "../profile/xp";
import { matchRecord } from "../record";
import { char, Game, ident, THEMES } from "../test-utils";
import { CLOCK_CUT_FLOOR_MS, GameError, TALK_FLOOR_MS } from "../types";
import { toView } from "../view";
import { impostorsFor, impPoints, maxRounds } from "./engine";
import type { ImpDeal, ImpQuestion } from "./types";

const Q: ImpQuestion[] = [
  { id: "g-brave", kind: "scale", choices: 10, spice: 1 },
  { id: "g-beach", kind: "pick", choices: 2, spice: 1 },
  { id: "g-color", kind: "color", choices: 12, spice: 1 },
  { id: "g-food", kind: "word", choices: 0, spice: 2 },
  { id: "g-emoji", kind: "emoji", choices: 12, spice: 2 },
];

const deal = (k: string): ImpDeal => ({
  crew: char(`crew-${k}`, `Tanjiro Kamado ${k}`, [`Tanjiro ${k}`]),
  impostor: char(`imp-${k}`, `Zenitsu Agatsuma ${k}`),
  spares: [
    { crew: char(`crew2-${k}`, "Luffy"), impostor: char(`imp2-${k}`, "Zoro") },
    {
      crew: char(`crew3-${k}`, "Naruto"),
      impostor: char(`imp3-${k}`, "Sasuke"),
    },
  ],
  questions: Q,
});
const DEALS = THEMES.map((_, i) => deal(String(i)));

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof GameError) return e.code;
    throw e;
  }
  return null;
};

/** An Impostor room of `players`, voted onto the first theme; the first question is open. */
function impostorGame(players = 5, seed = 1, impostors: number | null = null) {
  const g = new Game(players, seed, { game: "impostor", seats: 10, impostors });
  g.do({
    type: "START",
    playerId: g.state.hostId,
    themes: THEMES,
    deals: DEALS,
  });
  g.skipShow();
  g.voteAll(0);
  g.skipShow();
  g.skipReveal();
  return g;
}

const imp = (g: Game) => {
  const m = g.state.imp;
  if (!m) throw new Error("no impostor match");
  return m;
};
const crewIds = (g: Game) =>
  imp(g).dealt.filter((id) => !imp(g).impostors.includes(id));

/** Everyone still in answers 5 (or a pick's first option), past the reveal. */
function answerAll(g: Game) {
  const q = imp(g).asked.at(-1);
  for (const id of [...imp(g).dealt]) {
    if (g.state.phase !== "replying") break;
    if (imp(g).outs.some((o) => o.id === id)) continue;
    const answer =
      q?.question.kind === "word"
        ? { word: "pizza" }
        : { n: q?.question.kind === "scale" ? 5 : 0 };
    g.do({ type: "REPLY", playerId: id, answer });
  }
  g.skipReveal();
}

/** Everyone still in votes for `target` (who votes for the first other player). */
function voteOut(g: Game, target: string) {
  const still = imp(g).dealt.filter(
    (id) => !imp(g).outs.some((o) => o.id === id),
  );
  const other = still.find((id) => id !== target) ?? target;
  for (const id of still) {
    if (g.state.phase !== "talking") break;
    g.do({
      type: "ACCUSE",
      playerId: id,
      targetId: id === target ? other : target,
    });
  }
  g.skipReveal();
}

describe("impostor", () => {
  it("needs three players and the cards for every theme", () => {
    const two = new Game(2, 1, { game: "impostor", seats: 10 });
    expect(
      code(() =>
        two.do({ type: "START", playerId: "p1", themes: THEMES, deals: DEALS }),
      ),
    ).toBe("need_three_players");
    const three = new Game(3, 1, { game: "impostor", seats: 10 });
    expect(
      code(() => three.do({ type: "START", playerId: "p1", themes: THEMES })),
    ).toBe("invalid_input");
  });

  it('opens its first match with the round card, not the cold open of "Who am I?"', () => {
    const g = new Game(4, 1, { game: "impostor", seats: 10 });
    g.do({ type: "START", playerId: "p1", themes: THEMES, deals: DEALS });
    const kinds = (g.state.reveal?.beats ?? []).map((b) => b.kind);
    expect(kinds).toContain("round");
    expect(kinds).not.toContain("intro");
  });

  it("deals one impostor, two from seven players, and the host's number up to a third", () => {
    expect(impostorsFor(3, null)).toBe(1);
    expect(impostorsFor(6, null)).toBe(1);
    expect(impostorsFor(7, null)).toBe(2);
    expect(impostorsFor(10, 3)).toBe(3);
    expect(impostorsFor(5, 3)).toBe(1);
    expect(imp(impostorGame(5)).impostors).toHaveLength(1);
    expect(imp(impostorGame(7)).impostors).toHaveLength(2);
    expect(imp(impostorGame(9, 1, 3)).impostors).toHaveLength(3);
  });

  it("plays the deal show, then asks the first question", () => {
    const g = new Game(4, 1, { game: "impostor", seats: 10 });
    g.do({ type: "START", playerId: "p1", themes: THEMES, deals: DEALS });
    g.skipShow();
    g.voteAll(1);
    expect(g.state.phase).toBe("replying");
    expect(g.state.theme?.en).toBe("Robots");
    expect(g.state.reveal?.kind).toBe("deal");
    expect(g.state.reveal?.beats?.map((b) => b.kind)).toEqual([
      "settle",
      "theme",
      "card",
      "entrance",
    ]);
    expect(g.state.stepStartsAt).toBe(g.state.reveal?.until);
    expect(imp(g).crew.id).toBe("crew-1");
    expect(g.state.vote?.deals).toBeUndefined();
    // answering before the cards are in is too early
    expect(
      code(() => g.do({ type: "REPLY", playerId: "p1", answer: { n: 3 } })),
    ).toBe("too_early");
  });

  it("checks answers, refuses a word that names the card, and the clock gives back what a changed answer cut", () => {
    const g = impostorGame(5);
    const step = g.state.stepMs ?? 0;
    const deadline = g.state.deadline ?? 0;
    expect(
      code(() => g.do({ type: "REPLY", playerId: "p1", answer: { n: 11 } })),
    ).toBe("invalid_input");
    g.do({ type: "REPLY", playerId: "p1", answer: { n: 7 } });
    expect(g.state.deadline).toBe(deadline - step / 5);
    // changing it cuts nothing
    g.do({ type: "REPLY", playerId: "p1", answer: { n: 8 } });
    expect(g.state.deadline).toBe(deadline - step / 5);
    g.do({ type: "UNREPLY", playerId: "p1" });
    expect(g.state.deadline).toBe(deadline);
    answerAll(g); // the scale
    answerAll(g); // the pick
    expect(g.state.phase).toBe("talking");
    // a later question takes words
    const h = impostorGame(5);
    h.state.imp?.queue.unshift(Q[3]);
    answerAll(h);
    expect(imp(h).asked.at(-1)?.question.kind).toBe("word");
    const someone = crewIds(h)[0];
    expect(
      code(() =>
        h.do({ type: "REPLY", playerId: someone, answer: { word: "tanjiro" } }),
      ),
    ).toBe("gives_away");
    h.do({ type: "REPLY", playerId: someone, answer: { word: "  Onigiri  " } });
    expect(imp(h).asked.at(-1)?.answers[someone]).toEqual({ word: "Onigiri" });
  });

  it("shows the answers together, two questions before the first vote and one after", () => {
    const g = impostorGame(5);
    for (const id of imp(g).dealt.slice(0, 4))
      g.do({ type: "REPLY", playerId: id, answer: { n: 4 } });
    expect(g.state.reveal?.kind).toBe("deal");
    answerAll(g);
    expect(imp(g).asked).toHaveLength(2);
    expect(imp(g).asked[0].revealed).toBe(true);
    answerAll(g);
    expect(g.state.phase).toBe("talking");
    voteOut(g, crewIds(g)[0]);
    expect(g.state.phase).toBe("replying");
    expect(imp(g).round).toBe(2);
    answerAll(g);
    expect(g.state.phase).toBe("talking");
    expect(imp(g).asked.filter((a) => a.round === 2)).toHaveLength(1);
  });

  it("points for free; a confirmed vote cuts the talk down to its floor, taking it back gives it back", () => {
    const g = impostorGame(5);
    answerAll(g);
    answerAll(g);
    const [a, b, c] = imp(g).dealt;
    const deadline = g.state.deadline ?? 0;
    g.do({ type: "POINT", playerId: a, targetId: b });
    expect(g.state.deadline).toBe(deadline);
    expect(imp(g).vote?.points[a]).toBe(b);
    expect(code(() => g.do({ type: "ACCUSE", playerId: a, targetId: a }))).toBe(
      "invalid_input",
    );
    g.do({ type: "ACCUSE", playerId: a, targetId: c });
    expect(g.state.deadline).toBe(deadline - (g.state.stepMs ?? 0) / 5);
    g.do({ type: "UNACCUSE", playerId: a });
    expect(g.state.deadline).toBe(deadline);
    expect(imp(g).vote?.points[a]).toBe(c);
    // late in the talk, the floor holds
    g.now = deadline - TALK_FLOOR_MS - 5000;
    g.do({ type: "ACCUSE", playerId: a, targetId: c });
    expect(g.state.deadline).toBe(g.now + TALK_FLOOR_MS);
    expect(TALK_FLOOR_MS).toBeGreaterThan(CLOCK_CUT_FLOOR_MS);
  });

  it("a tie sends nobody out", () => {
    const g = impostorGame(4);
    answerAll(g);
    answerAll(g);
    const [a, b, c, d] = imp(g).dealt;
    g.do({ type: "ACCUSE", playerId: a, targetId: b });
    g.do({ type: "ACCUSE", playerId: b, targetId: a });
    g.do({ type: "ACCUSE", playerId: c, targetId: a });
    g.do({ type: "ACCUSE", playerId: d, targetId: b });
    expect(g.state.reveal?.kind).toBe("out");
    expect(imp(g).outs).toHaveLength(0);
    expect(g.state.phase).toBe("replying");
    expect(imp(g).round).toBe(2);
    const view = toView(g.state, 1, a, g.now, "pt");
    expect(view.reveal).toMatchObject({
      kind: "out",
      id: null,
      impostor: null,
    });
  });

  it("a caught impostor guesses the crew's card; the crew wins and the guess shows at the end", () => {
    const g = impostorGame(5);
    answerAll(g);
    answerAll(g);
    const bad = imp(g).impostors[0];
    voteOut(g, bad);
    expect(g.state.phase).toBe("last_chance");
    expect(imp(g).guessing).toBe(bad);
    const crew = crewIds(g)[0];
    expect(
      code(() => g.do({ type: "LAST_GUESS", playerId: crew, text: "x" })),
    ).toBe("not_your_turn");
    g.skipReveal();
    g.do({ type: "LAST_GUESS", playerId: bad, text: "tanjiro 0" });
    expect(g.state.phase).toBe("finished");
    expect(imp(g)).toMatchObject({ winner: "crew", reason: "caught" });
    expect(imp(g).outs[0]).toMatchObject({
      id: bad,
      impostor: true,
      hit: true,
    });
    const points = impPoints(imp(g));
    // +2 for the crew's win, +1 for each crew vote on the impostor, +3 for the guess
    for (const id of crewIds(g)) expect(points[id]).toBe(3);
    expect(points[bad]).toBe(3);
    const view = toView(g.state, 1, crew, g.now, "pt").imp;
    expect(view?.end?.impostorIds).toEqual([bad]);
    expect(view?.end?.outs[0].guess).toBe("tanjiro 0");
    expect(
      g.state.matches?.[0].players.filter((p) => p.place === 1),
    ).toHaveLength(4);
    // the record: the votes taken, the right first vote, the hit and its XP
    const players = matchRecord(g.state, g.now)?.players ?? [];
    const caught = players.find((p) => p.userId === bad);
    expect(caught?.impostor).toMatchObject({
      impostor: true,
      outRound: 1,
      votesTaken: 4,
      guessHit: true,
    });
    expect(caught?.xp).toBe(XP.finish + GAME_XP.impostor.guessHit);
    const mate = players.find((p) => p.userId === crew);
    expect(mate?.impostor).toMatchObject({ rightVotes: 1, firstRight: true });
    expect(mate?.xp).toBe(XP.finish + XP.first + GAME_XP.impostor.rightVote);
  });

  it("the impostors win once they are as many as the rest, or when the rounds run out", () => {
    const g = impostorGame(4);
    for (const victim of crewIds(g).slice(0, 2)) {
      answerAll(g);
      if (imp(g).round === 1) answerAll(g);
      voteOut(g, victim);
    }
    expect(g.state.phase).toBe("finished");
    expect(imp(g)).toMatchObject({ winner: "impostors", reason: "even" });
    expect(impPoints(imp(g))[imp(g).impostors[0]]).toBe(5);

    const h = impostorGame(5);
    for (let round = 1; round <= maxRounds(5); round++) {
      answerAll(h);
      if (round === 1) answerAll(h);
      h.timeout(); // nobody voted: a tie
      h.skipReveal();
    }
    expect(imp(h)).toMatchObject({ winner: "impostors", reason: "rounds" });
  });

  it("the clock: unanswered stays so, unconfirmed points don't count, no guess misses", () => {
    const g = impostorGame(5);
    g.do({ type: "REPLY", playerId: imp(g).dealt[0], answer: { n: 2 } });
    g.timeout();
    expect(imp(g).asked[0]).toMatchObject({ revealed: true });
    expect(Object.keys(imp(g).asked[0].answers)).toHaveLength(1);
    g.skipReveal();
    answerAll(g);
    const bad = imp(g).impostors[0];
    for (const id of imp(g).dealt)
      if (id !== bad) g.do({ type: "POINT", playerId: id, targetId: bad });
    g.timeout();
    expect(imp(g).outs).toHaveLength(0);
    g.skipReveal();
    answerAll(g);
    voteOut(g, bad);
    g.timeout();
    expect(imp(g).outs[0]).toMatchObject({ guess: null, hit: false });
    expect(imp(g).winner).toBe("crew");
  });

  it("someone who doesn't know their card swaps everyone's, at most twice, before any answer shows", () => {
    const g = impostorGame(5);
    const [a, b] = imp(g).dealt;
    g.do({ type: "REPLY", playerId: a, answer: { n: 3 } });
    g.do({ type: "DONT_KNOW", playerId: b });
    expect(imp(g).crew.name).toBe("Luffy");
    expect(imp(g).asked[0].answers).toEqual({});
    expect(g.state.reveal?.kind).toBe("swap");
    g.skipReveal();
    g.do({ type: "DONT_KNOW", playerId: a });
    g.skipReveal();
    expect(code(() => g.do({ type: "DONT_KNOW", playerId: a }))).toBe(
      "already_done",
    );
    answerAll(g);
    expect(code(() => g.do({ type: "DONT_KNOW", playerId: a }))).toBe(
      "wrong_phase",
    );
  });

  it("leaving: the crew wins when the impostors walk out, they win when the crew does", () => {
    const g = impostorGame(4);
    g.do({ type: "LEAVE", playerId: imp(g).impostors[0] });
    expect(imp(g)).toMatchObject({ winner: "crew", reason: "left" });

    const h = impostorGame(4);
    const [x, y] = crewIds(h);
    h.do({ type: "LEAVE", playerId: x });
    expect(h.state.phase).toBe("replying");
    // the one who left isn't waited for
    for (const id of imp(h).dealt)
      if (id !== x && h.state.phase === "replying")
        h.do({ type: "REPLY", playerId: id, answer: { n: 1 } });
    expect(imp(h).asked[0].revealed).toBe(true);
    h.do({ type: "LEAVE", playerId: y });
    expect(imp(h)).toMatchObject({ winner: "impostors", reason: "even" });
  });

  it("each player sees their own card only, never which side it is", () => {
    const g = impostorGame(5);
    const bad = imp(g).impostors[0];
    const crew = crewIds(g)[0];
    const mine = toView(g.state, 1, bad, g.now, "pt").imp;
    const theirs = toView(g.state, 1, crew, g.now, "pt").imp;
    expect(mine?.card?.characterId).toBe("imp-0");
    expect(theirs?.card?.characterId).toBe("crew-0");
    expect(JSON.stringify(theirs)).not.toContain("imp-0");
    expect(JSON.stringify(mine)).not.toContain("crew-0");
    expect(mine?.impostors).toBe(1);
    expect(mine?.end).toBeNull();
    g.do({ type: "REPLY", playerId: crew, answer: { n: 9 } });
    const open = toView(g.state, 1, bad, g.now, "pt").imp?.asked[0];
    expect(open).toMatchObject({
      answeredIds: [crew],
      yours: null,
      answers: null,
    });
  });

  it("a guest who signs in keeps their part in the match", () => {
    const g = impostorGame(4);
    const bad = imp(g).impostors[0];
    g.do({ type: "REPLY", playerId: bad, answer: { n: 3 } });
    g.do({ type: "SWAP_PLAYER", from: bad, player: ident("acct") });
    expect(imp(g).impostors).toEqual(["acct"]);
    expect(imp(g).asked[0].answers.acct).toEqual({ n: 3 });
  });

  it("switching games keeps the seats in range and colours within the game's", () => {
    const g = new Game(5, 1, { game: "impostor", seats: 10 });
    expect(g.state.players.map((p) => p.colorSlot)).toHaveLength(5);
    expect(
      code(() =>
        g.do({
          type: "UPDATE_SETTINGS",
          playerId: "p1",
          settings: { game: "who-am-i" },
        }),
      ),
    ).toBe("invalid_input");
    const h = new Game(3, 1, { game: "who-am-i" });
    h.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { game: "impostor" },
    });
    expect(h.state.settings.seats).toBe(4);
    h.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { seats: 10, impostors: 2 },
    });
    expect(
      code(() =>
        h.do({
          type: "UPDATE_SETTINGS",
          playerId: "p1",
          settings: { impostors: 4 },
        }),
      ),
    ).toBe("invalid_input");
    h.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { game: "who-am-i" },
    });
    expect(h.state.settings.seats).toBe(4);
    expect(h.state.players.every((p) => p.colorSlot < 4)).toBe(true);
  });
});
