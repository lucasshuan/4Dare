import { describe, expect, it } from "vitest";
import { isCloseMatch, normalizeName } from "./match";
import { Game } from "./test-utils";
import { GameError } from "./types";
import { toPublicRoom, toView } from "./view";

function started(n: number, seed = 3) {
  const g = new Game(n, seed);
  g.start();
  g.pickAll();
  return g;
}

const view = (g: Game, id: string) => toView(g.state, 1, id, g.now);
const leaks = (g: Game, id: string) => {
  const json = JSON.stringify(view(g, id));
  return json.includes(`c-${id}`) || json.includes(`Name ${id}`);
};

describe("secrecy", () => {
  it("outsiders get nothing", () => {
    const g = started(2);
    expect(() => view(g, "stranger")).toThrow(GameError);
  });

  it("nobody sees their own card while playing", () => {
    const g = started(3);
    for (const p of g.state.players) {
      expect(leaks(g, p.id)).toBe(false);
      const me = view(g, p.id).players.find((x) => x.isYou);
      expect(me).toMatchObject({
        card: null,
        cardHidden: true,
        pickedById: null,
      });
      const others = view(g, p.id).players.filter((x) => !x.isYou);
      expect(
        others.every((o) => o.card !== null && o.pickedById !== null),
      ).toBe(true);
    }
  });

  it("cards stay closed while picking, except the one you picked", () => {
    const g = new Game(3, 3);
    g.start();
    const [target, a] = Object.entries(g.state.assignments)[0];
    g.do({
      type: "PICK",
      playerId: a.pickerId,
      character: {
        id: "secret",
        lang: "pt",
        name: "Secret",
        origin: null,
        imageUrl: null,
        aliases: [],
      },
    });
    const pickerView = view(g, a.pickerId);
    expect(pickerView.pick).toMatchObject({
      targetId: target,
      confirmed: true,
    });
    expect(pickerView.pick?.character?.name).toBe("Secret");
    expect(JSON.stringify(view(g, target))).not.toContain("Secret");
    expect(pickerView.players.every((p) => p.card === null)).toBe(true);
  });

  it("answers stay hidden until everyone answered", () => {
    const g = started(3);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Q?" });
    const [first, second] = g.state.order.filter((id) => id !== asker);
    g.do({ type: "ANSWER", playerId: first, value: "no", note: "first-note" });
    expect(JSON.stringify(view(g, second))).not.toContain("first-note");
    expect(view(g, first).turn?.yourAnswer).toEqual({
      value: "no",
      note: "first-note",
    });
    expect(view(g, asker).turn?.answeredIds).toEqual([first]);
    expect(view(g, asker).turn?.answers).toBeNull();
  });

  it("a miss never shows you your own card; a hit does", () => {
    const g = started(2);
    const guesser = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: guesser, text: "wrong" });
    const validator = g.state.assignments[guesser].pickerId;
    g.do({ type: "VALIDATE", playerId: validator, correct: false });
    const mine = view(g, guesser).reveal;
    expect(mine).toMatchObject({ kind: "guess", result: "miss", card: null });
    expect(leaks(g, guesser)).toBe(false);
    expect(view(g, validator).reveal).toMatchObject({
      card: { name: `Name ${guesser}` },
    });

    const next = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: next, text: `Name ${next}` });
    expect(view(g, next).reveal).toMatchObject({
      result: "hit",
      place: 1,
      card: { name: `Name ${next}` },
    });
    expect(view(g, next).players.find((p) => p.isYou)?.card?.name).toBe(
      `Name ${next}`,
    );
  });

  it("the reveal disappears when it ends", () => {
    const g = started(2);
    g.do({ type: "ASK", playerId: g.turn, text: "Q?" });
    g.do({
      type: "ANSWER",
      playerId: g.state.order[1],
      value: "yes",
      note: null,
    });
    expect(view(g, g.turn).reveal?.kind).toBe("answers");
    g.now = g.state.reveal?.until as number;
    expect(view(g, g.turn).reveal).toBeNull();
  });
});

describe("what the view says", () => {
  it("statuses follow the step", () => {
    const g = started(3);
    const asker = g.turn;
    const status = (viewer: string, id: string) =>
      view(g, viewer).players.find((p) => p.id === id)?.status;
    expect(status(asker, asker)).toBe("asking");
    const other = g.state.order.find((id) => id !== asker) as string;
    expect(status(asker, other)).toBe("will_answer");
    g.do({ type: "ASK", playerId: asker, text: "Q?" });
    expect(status(asker, asker)).toBe("waiting");
    expect(status(asker, other)).toBe("answering");
    g.do({ type: "ANSWER", playerId: other, value: "yes", note: null });
    expect(status(asker, other)).toBe("answered");
    expect(view(g, asker).players.find((p) => p.id === asker)?.isTurn).toBe(
      true,
    );
  });

  it("the turn view carries the question, then the answers, then the guess", () => {
    const g = started(2);
    const asker = g.askAndAnswer("Is it big?");
    const t = view(g, asker).turn;
    expect(t).toMatchObject({ n: 1, question: "Is it big?" });
    expect(t?.answers).toHaveLength(1);
    g.do({ type: "GUESS", playerId: asker, text: "maybe" });
    const v = view(g, asker).turn;
    expect(v).toMatchObject({ n: 2, guess: "maybe", question: "Is it big?" });
    expect(v?.validatorId).toBe(g.state.assignments[asker].pickerId);
  });

  it("history lists resolved plays only, oldest first", () => {
    const g = started(2);
    const asker = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: asker, text: "maybe" });
    const h = view(g, asker).history;
    expect(h.map((e) => e.n)).toEqual([1]);
  });

  it("public rooms are listed while there is a free seat", () => {
    const g = new Game(2, 1, { seats: 3 });
    expect(toPublicRoom(g.state, g.now)).toMatchObject({
      players: 2,
      seats: 3,
    });
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { visibility: "private" },
    });
    expect(toPublicRoom(g.state, g.now)).toBeNull();
    const h = new Game(2, 1, { seats: 2 });
    expect(toPublicRoom(h.state, h.now)).toBeNull();
    const t = new Game(1);
    expect(toPublicRoom(t.state, t.state.deadline as number)).toBeNull();
  });
});

describe("guess matching", () => {
  it("normalises accents, case, kana and articles", () => {
    expect(normalizeName("Pokémon")).toBe("pokemon");
    expect(normalizeName("  The   Joker ")).toBe("joker");
    expect(normalizeName("O Coringa")).toBe("coringa");
    expect(normalizeName("ピカチュウ")).toBe(normalizeName("ぴかちゅう"));
    expect(normalizeName("ガンダム")).toBe("がんだむ");
    expect(normalizeName("Ｓｕｐｅｒ　Ｍａｒｉｏ")).toBe("supermario");
    expect(normalizeName("A")).toBe("a");
  });

  it("accepts small typos on longer names only", () => {
    expect(isCloseMatch("darth vader", ["Darth Vader"])).toBe(true);
    expect(isCloseMatch("dart vader", ["Darth Vader"])).toBe(true);
    expect(isCloseMatch("drth vadr", ["Darth Vader"])).toBe(true);
    expect(isCloseMatch("dr vde", ["Darth Vader"])).toBe(false);
    expect(isCloseMatch("Thor", ["Thor"])).toBe(true);
    expect(isCloseMatch("Thos", ["Thor"])).toBe(false);
    expect(isCloseMatch("Mrio", ["Mario"])).toBe(true);
    expect(isCloseMatch("", ["Mario"])).toBe(false);
    expect(isCloseMatch("!!!", ["???"])).toBe(false);
    expect(isCloseMatch("Lord Vader", ["Darth Vader"])).toBe(false);
    expect(isCloseMatch("Coringa", ["Joker", "Coringa"])).toBe(true);
    expect(isCloseMatch("x".repeat(5000), ["Mario"])).toBe(false);
  });
});
