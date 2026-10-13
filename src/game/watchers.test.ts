import { describe, expect, it } from "vitest";
import { admitWatcher } from "./engine";
import { char, Game, ident } from "./test-utils";
import { BAN_MS, GameError, KICK_MS } from "./types";
import { toView } from "./view";

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof GameError) return e.code;
    throw e;
  }
  return "no error";
};

const ids = (g: Game) => g.state.players.map((p) => p.id);

describe("seats and watchers", () => {
  it("someone watching takes a free seat, at the end or where the host says", () => {
    const g = new Game(2, 1, { seats: 4 });
    g.do({ type: "SIT", playerId: "w1", player: ident("w1") });
    expect(ids(g)).toEqual(["p1", "p2", "w1"]);
    g.do({ type: "SIT", playerId: "p1", player: ident("w2"), at: 1 });
    expect(ids(g)).toEqual(["p1", "w2", "p2", "w1"]);
    // every seat taken
    expect(
      code(() => g.do({ type: "SIT", playerId: "w3", player: ident("w3") })),
    ).toBe("room_full");
    // a colour each
    const colours = g.state.players.map((p) => p.colorSlot);
    expect(new Set(colours).size).toBe(colours.length);
  });

  it("only the host seats someone else, and only in the lobby", () => {
    const g = new Game(3, 1, { seats: 5 });
    expect(
      code(() => g.do({ type: "SIT", playerId: "p2", player: ident("w1") })),
    ).toBe("not_host");
    g.start();
    expect(
      code(() => g.do({ type: "SIT", playerId: "w1", player: ident("w1") })),
    ).toBe("wrong_phase");
  });

  it("a player gets up to watch; the host moves anyone but themselves", () => {
    const g = new Game(4);
    g.do({ type: "STAND", playerId: "p2", targetId: "p2" });
    expect(ids(g)).toEqual(["p1", "p3", "p4"]);
    g.do({ type: "STAND", playerId: "p1", targetId: "p3" });
    expect(ids(g)).toEqual(["p1", "p4"]);
    expect(
      code(() => g.do({ type: "STAND", playerId: "p1", targetId: "p1" })),
    ).toBe("invalid_input");
    expect(
      code(() => g.do({ type: "STAND", playerId: "p4", targetId: "p1" })),
    ).toBe("not_host");
  });

  it("someone watching trades places with a player", () => {
    const g = new Game(3);
    const before = g.state.players[1].colorSlot;
    g.do({
      type: "SWAP_SEAT",
      playerId: "p1",
      targetId: "p2",
      player: ident("w1"),
    });
    expect(ids(g)).toEqual(["p1", "w1", "p3"]);
    // the colour that freed up is theirs if nobody else holds it
    const slots = g.state.players.map((p) => p.colorSlot);
    expect(new Set(slots).size).toBe(3);
    expect(typeof before).toBe("number");
    expect(
      code(() =>
        g.do({
          type: "SWAP_SEAT",
          playerId: "p1",
          targetId: "p1",
          player: ident("w2"),
        }),
      ),
    ).toBe("invalid_input");
  });

  it("two players trade places", () => {
    const g = new Game(3);
    g.do({ type: "SWAP_SEATS", playerId: "p1", a: "p1", b: "p3" });
    expect(ids(g)).toEqual(["p3", "p2", "p1"]);
    expect(
      code(() =>
        g.do({ type: "SWAP_SEATS", playerId: "p2", a: "p1", b: "p3" }),
      ),
    ).toBe("not_host");
  });

  it("seats stay as they are while a start waits", () => {
    const g = new Game(3, 1, { seats: 5 });
    g.state.starting = {
      until: g.now + 5000,
      ready: [],
      start: { playerId: "p1" },
    };
    expect(
      code(() => g.do({ type: "STAND", playerId: "p2", targetId: "p2" })),
    ).toBe("wrong_phase");
    expect(
      code(() => g.do({ type: "SIT", playerId: "w1", player: ident("w1") })),
    ).toBe("wrong_phase");
  });
});

describe("the host's say over people", () => {
  it("silences someone and lets them talk again, never the host", () => {
    const g = new Game(3);
    g.do({ type: "MUTE", playerId: "p1", targetId: "w1", muted: true });
    g.do({ type: "MUTE", playerId: "p1", targetId: "p2", muted: true });
    expect(g.state.muted).toEqual(["w1", "p2"]);
    g.do({ type: "MUTE", playerId: "p1", targetId: "w1", muted: false });
    expect(g.state.muted).toEqual(["p2"]);
    expect(
      code(() =>
        g.do({ type: "MUTE", playerId: "p1", targetId: "p1", muted: true }),
      ),
    ).toBe("invalid_input");
    // handed the room, they can talk
    g.do({ type: "TRANSFER_HOST", playerId: "p1", targetId: "p2" });
    expect(g.state.muted).toEqual([]);
  });

  it("kicks someone watching even mid-match, and a ban lasts", () => {
    const g = new Game(3);
    g.start();
    g.do({ type: "KICK", playerId: "p1", targetId: "w1", watcher: true });
    g.do({
      type: "KICK",
      playerId: "p1",
      targetId: "w2",
      watcher: true,
      ban: true,
    });
    expect(g.state.kicked?.w1).toBe(g.now + KICK_MS);
    expect(g.state.kicked?.w2).toBe(g.now + BAN_MS);
    expect(code(() => admitWatcher(g.state, "w1", undefined, g.now))).toBe(
      "kicked",
    );
    expect(code(() => admitWatcher(g.state, "w2", undefined, g.now))).toBe(
      "banned",
    );
    // a seated player is still only kicked from the lobby
    expect(
      code(() => g.do({ type: "KICK", playerId: "p1", targetId: "p2" })),
    ).toBe("wrong_phase");
    // nobody unknown is kicked without the server saying they watch
    expect(
      code(() => g.do({ type: "KICK", playerId: "p1", targetId: "w3" })),
    ).toBe("not_member");
  });

  it("asks newcomers to watch for a private room's password", () => {
    const g = new Game(2);
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { visibility: "private", password: "abc" },
    });
    expect(code(() => admitWatcher(g.state, "w1", undefined, g.now))).toBe(
      "password_required",
    );
    expect(code(() => admitWatcher(g.state, "w1", "nope", g.now))).toBe(
      "wrong_password",
    );
    expect(code(() => admitWatcher(g.state, "w1", "abc", g.now))).toBe(
      "no error",
    );
  });
});

describe("what someone watching sees", () => {
  it("every card on the table, no pick of their own, no start key", () => {
    const g = new Game(3);
    g.start();
    for (const [target, a] of Object.entries(g.state.assignments))
      g.do({
        type: "PICK",
        playerId: a.pickerId,
        character: char(`c-${target}`),
      });
    g.skipShow();
    g.skipReveal();
    const v = toView(g.state, 1, "w1", g.now, "pt", ident("w1"));
    expect(v.watching).toBe(true);
    expect(v.players.some((p) => p.isYou)).toBe(false);
    expect(v.players.every((p) => p.card !== null)).toBe(true);
    expect(v.pick).toBeNull();
    expect(v.canStart).toBe(false);
    expect(code(() => toView(g.state, 1, "w1", g.now, "pt"))).toBe(
      "not_member",
    );
  });
});
