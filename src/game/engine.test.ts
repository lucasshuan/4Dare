import { describe, expect, it } from "vitest";
import { createRoom, isExpired, reduce } from "./engine";
import { abandoned, presenceDue } from "./helpers";
import { char, Game, ident, THEMES } from "./test-utils";
import {
  ANSWER_CUT_FLOOR_MS,
  DEFAULT_SETTINGS,
  GameError,
  GONE_GRACE_MS,
  HOST_THEME_SECONDS,
  LOBBY_SECONDS,
  PICK_SECONDS,
  RESULT_SECONDS,
  REVEAL_TIMING,
  type RoomState,
  STEP_SECONDS_MIN,
  VOTE_SECONDS,
} from "./types";
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

const ASK = DEFAULT_SETTINGS.askSeconds * 1000;
const GUESS = DEFAULT_SETTINGS.guessSeconds * 1000;

describe("lobby", () => {
  it("creates a room with the host seated and no clock until someone joins", () => {
    const g = new Game(1);
    const s = g.state;
    expect(s.phase).toBe("lobby");
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({ id: "p1", ready: true, away: false });
    expect(s.deadline).toBeNull();
    expect(s.stepStartsAt).toBeNull();
    expect(s.reveal).toBeNull();
    g.do({ type: "JOIN", player: ident("p2") });
    expect(g.state.deadline).toBe(g.now + LOBBY_SECONDS * 1000);
    expect(g.state.stepStartsAt).toBe(g.now);
  });

  it("rejects invalid settings", () => {
    const ctx = { now: 0, random: Math.random };
    const bad = [
      { seats: 5 },
      { askSeconds: 10 },
      { guessSeconds: 301 },
      { answerSeconds: 60.5 },
      { validateSeconds: "60" },
      { themeMode: "anyone" },
      { themeSets: [] },
      { themeSets: ["games", "nope"] },
    ];
    for (const patch of bad) {
      expect(
        code(() =>
          createRoom(
            "X",
            ident("a"),
            { ...DEFAULT_SETTINGS, ...patch } as never,
            ctx,
          ),
        ),
      ).toBe("invalid_input");
    }
  });

  it("seats players up to the limit and restarts the lobby clock", () => {
    const g = new Game(1, 1, { seats: 2 });
    g.now += 5000;
    g.do({ type: "JOIN", player: ident("p2") });
    expect(g.state.deadline).toBe(g.now + LOBBY_SECONDS * 1000);
    expect(g.state.players[1].ready).toBe(false);
    expect(code(() => g.do({ type: "JOIN", player: ident("p3") }))).toBe(
      "room_full",
    );
  });

  it("keeps each theme set once, in the screens' order", () => {
    const g = new Game(1, 1, { themeSets: ["music", "games", "music"] });
    expect(g.state.settings.themeSets).toEqual(["games", "music"]);
  });

  it("rooms saved before the theme settings get the defaults when edited", () => {
    const g = new Game(1);
    const { themeMode: _, themeSets: __, ...old } = g.state.settings;
    g.state = { ...g.state, settings: old as RoomState["settings"] };
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { askSeconds: STEP_SECONDS_MIN },
    });
    expect(g.state.settings).toMatchObject({
      themeMode: "vote",
      themeSets: DEFAULT_SETTINGS.themeSets,
    });
  });

  it("joining twice refreshes the identity instead of failing", () => {
    const g = new Game(2);
    g.do({ type: "JOIN", player: { ...ident("p2"), name: "Bia" } });
    expect(g.state.players).toHaveLength(2);
    expect(g.state.players[1].name).toBe("Bia");
  });

  it("a private room asks newcomers for its password", () => {
    const g = new Game(1, 1, { visibility: "private", password: " pizza " });
    expect(g.state.settings.password).toBe("pizza");
    const join = (id: string, password?: string) =>
      code(() => g.do({ type: "JOIN", player: ident(id), password }));
    expect(join("p2")).toBe("password_required");
    expect(join("p2", "pasta")).toBe("wrong_password");
    expect(join("p2", "pizza ")).toBe("no error");
    // back in without it: the seat is theirs
    expect(join("p2")).toBe("no error");
    const upd = (settings: object) =>
      code(() => g.do({ type: "UPDATE_SETTINGS", playerId: "p1", settings }));
    expect(upd({ password: "" })).toBe("invalid_input");
    expect(upd({ password: "x".repeat(21) })).toBe("invalid_input");
    // going public drops the password
    expect(upd({ visibility: "public" })).toBe("no error");
    expect(g.state.settings.password).toBe("");
    expect(join("p3")).toBe("no error");
    expect(upd({ visibility: "private" })).toBe("invalid_input");
  });

  it("hands the room to the next player when the host leaves, and closes when empty", () => {
    const g = new Game(2);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.phase).toBe("lobby");
    expect(g.state.hostId).toBe("p2");
    expect(g.state.players[0].ready).toBe(true);
    // alone again: the clock stops, so the room waits instead of closing
    expect(g.state.deadline).toBeNull();
    g.do({ type: "LEAVE", playerId: "p2" });
    expect(g.state.phase).toBe("closed");
    expect(code(() => g.do({ type: "JOIN", player: ident("p9") }))).toBe(
      "not_found",
    );
  });

  it("only the host changes settings, never below the seated count", () => {
    const g = new Game(3);
    const upd = (playerId: string, settings: object) =>
      code(() => g.do({ type: "UPDATE_SETTINGS", playerId, settings }));
    expect(upd("p2", { seats: 4 })).toBe("not_host");
    expect(upd("p1", { seats: 2 })).toBe("invalid_input");
    expect(upd("p1", { answerSeconds: 29 })).toBe("invalid_input");
    // one time per step now; the old single setting is gone
    expect(upd("p1", { stepSeconds: 60 })).toBe("invalid_input");
    expect(upd("p1", { color: "red" })).toBe("invalid_input");
    expect(upd("p1", { game: "chess" })).toBe("invalid_input");
    expect(upd("p1", { name: "x".repeat(26) })).toBe("invalid_input");
    expect(upd("p1", { name: 7 })).toBe("invalid_input");
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { name: "  Saturday crew  " },
    });
    expect(g.state.settings.name).toBe("Saturday crew");
    expect(upd("p1", { game: "who-am-i" })).toBe("no error");
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { askSeconds: 60, visibility: "private", password: "pw" },
    });
    expect(g.state.settings).toMatchObject({
      askSeconds: 60,
      visibility: "private",
    });
  });

  it("guests set ready; the host cannot start alone or as someone else", () => {
    const g = new Game(1);
    expect(code(() => g.start())).toBe("need_two_players");
    g.do({ type: "JOIN", player: ident("p2") });
    g.do({ type: "SET_READY", playerId: "p2", ready: true });
    expect(g.state.players[1].ready).toBe(true);
    expect(
      code(() => g.do({ type: "START", playerId: "p2", themes: THEMES })),
    ).toBe("not_host");
    g.start();
    expect(g.state.phase).toBe("picking");
    expect(code(() => g.do({ type: "JOIN", player: ident("p3") }))).toBe(
      "already_started",
    );
  });

  it("the lobby clock starts the match with 2+ players", () => {
    const g = new Game(2);
    expect(code(() => g.do({ type: "TIMEOUT", themes: THEMES }))).toBe(
      "wrong_phase",
    );
    expect(code(() => g.timeout())).toBe("invalid_input");
    g.timeout({ themes: THEMES });
    expect(g.state.phase).toBe("voting");
  });

  it("the room goes to whoever joined first", () => {
    const g = new Game(3);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.hostId).toBe("p2");
    expect(g.state.deadline).not.toBeNull();
  });
});

describe("the theme vote", () => {
  const voting = (players: number, seed = 1) => {
    const g = new Game(players, seed);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    return g;
  };
  const vote = (g: Game, playerId: string, option: number) =>
    g.do({ type: "VOTE", playerId, option });

  it("starts with three themes and a short clock; needs exactly three", () => {
    const g = new Game(2);
    expect(
      code(() =>
        g.do({ type: "START", playerId: "p1", themes: THEMES.slice(0, 2) }),
      ),
    ).toBe("invalid_input");
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    expect(g.state.phase).toBe("voting");
    expect(g.state.theme).toBeNull();
    expect(g.state.vote?.options).toEqual(THEMES);
    expect(g.state.deadline).toBe(g.now + VOTE_SECONDS * 1000);
  });

  it("the most voted theme wins once everyone voted; votes can change until then", () => {
    const g = voting(3);
    vote(g, "p1", 2);
    vote(g, "p1", 1);
    vote(g, "p2", 1);
    expect(g.state.phase).toBe("voting");
    expect(code(() => vote(g, "p3", 3))).toBe("invalid_input");
    expect(code(() => vote(g, "ghost", 0))).toBe("not_member");
    vote(g, "p3", 0);
    expect(g.state.phase).toBe("picking");
    expect(g.state.theme).toEqual(THEMES[1]);
    expect(g.state.vote).toMatchObject({ chosen: 1, tied: [1] });
    expect(g.state.reveal).toMatchObject({
      kind: "theme",
      until: g.now + REVEAL_TIMING.theme,
    });
    // the picking clock waits for the reveal
    expect(g.state.stepStartsAt).toBe(g.state.reveal?.until);
    expect(code(() => vote(g, "p3", 1))).toBe("wrong_phase");
  });

  it("a tie is drawn among the tied themes, with a longer reveal", () => {
    const g = voting(2);
    vote(g, "p1", 0);
    vote(g, "p2", 2);
    expect(g.state.vote?.tied).toEqual([0, 2]);
    expect([0, 2]).toContain(g.state.vote?.chosen);
    expect(g.state.reveal?.until).toBe(
      g.now + REVEAL_TIMING.theme + REVEAL_TIMING.themeTieSpin,
    );
  });

  it("when the clock runs out, the votes so far decide; no votes is a draw of all three", () => {
    const g = voting(3);
    vote(g, "p2", 2);
    g.timeout();
    expect(g.state.theme).toEqual(THEMES[2]);

    const quiet = voting(2, 7);
    quiet.timeout();
    expect(quiet.state.phase).toBe("picking");
    expect(quiet.state.vote?.tied).toEqual([0, 1, 2]);
  });

  it("someone leaving drops their vote; alone, the room goes back to the lobby", () => {
    const g = voting(3);
    vote(g, "p1", 0);
    vote(g, "p2", 1);
    g.do({ type: "LEAVE", playerId: "p3" });
    expect(g.state.phase).toBe("picking");
    expect(g.state.players.map((p) => p.id)).toEqual(["p1", "p2"]);

    const h = voting(2);
    vote(h, "p2", 1);
    h.do({ type: "LEAVE", playerId: "p2" });
    expect(h.state.phase).toBe("lobby");
    expect(h.state.vote).toBeNull();
    expect(h.state.deadline).toBeNull();
  });

  it("the host leaving hands the room over and the vote goes on", () => {
    const g = voting(3);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.phase).toBe("voting");
    expect(g.state.hostId).toBe("p2");
  });
});

describe("the host types the theme", () => {
  const theming = (players: number) => {
    const g = new Game(players, 1, { themeMode: "host" });
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    return g;
  };

  it("starts with the host typing, ideas at hand and a 30 s clock", () => {
    const g = theming(3);
    expect(g.state.phase).toBe("theming");
    expect(g.state.vote).toBeNull();
    expect(g.state.ideas).toEqual(THEMES);
    expect(g.state.deadline).toBe(g.now + HOST_THEME_SECONDS * 1000);
  });

  it("only the host sets it; it is shown to everyone, then picking starts", () => {
    const g = theming(2);
    const set = (playerId: string, text: string) =>
      g.do({ type: "SET_THEME", playerId, text });
    expect(code(() => set("p2", "Pirates"))).toBe("not_host");
    expect(code(() => set("p1", "   "))).toBe("invalid_input");
    expect(code(() => set("p1", "x".repeat(51)))).toBe("invalid_input");
    set("p1", "  Space   cowboys ");
    expect(g.state.phase).toBe("picking");
    expect(g.state.theme).toEqual({
      en: "Space cowboys",
      pt: "Space cowboys",
      ja: "Space cowboys",
      set: null,
    });
    expect(g.state.ideas).toEqual([]);
    expect(g.state.reveal).toMatchObject({
      kind: "theme",
      until: g.now + REVEAL_TIMING.theme,
    });
    expect(g.state.stepStartsAt).toBe(g.state.reveal?.until);
    expect(code(() => set("p1", "Again"))).toBe("wrong_phase");
  });

  it("when the host runs out of time, everyone votes instead", () => {
    const g = theming(2);
    expect(code(() => g.timeout())).toBe("invalid_input");
    g.timeout({ themes: THEMES });
    expect(g.state.phase).toBe("voting");
    expect(g.state.vote?.options).toEqual(THEMES);
    expect(g.state.deadline).toBe(g.now + VOTE_SECONDS * 1000);
  });

  it("a host who leaves hands the typing over; alone, back to the lobby", () => {
    const g = theming(3);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.phase).toBe("theming");
    expect(g.state.hostId).toBe("p2");
    g.do({ type: "SET_THEME", playerId: "p2", text: "Pirates" });
    expect(g.state.theme?.en).toBe("Pirates");

    const pair = theming(2);
    pair.do({ type: "LEAVE", playerId: "p2" });
    expect(pair.state.phase).toBe("lobby");
  });

  it("the lobby clock and the next match go to the host's typing too", () => {
    const g = new Game(2, 1, { themeMode: "host" });
    g.timeout({ themes: [] });
    expect(g.state.phase).toBe("theming");
    g.do({ type: "SET_THEME", playerId: "p1", text: "Pirates" });
    g.skipReveal();
    g.pickAll();
    g.do({ type: "GIVE_UP", playerId: g.turn });
    g.do({ type: "GIVE_UP", playerId: g.turn });
    expect(g.state.phase).toBe("finished");
    g.do({ type: "BACK_TO_LOBBY", playerId: "p1" });
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    expect(g.state.phase).toBe("theming");
  });
});

describe("the ring", () => {
  it("everyone picks for exactly one other player, never for themselves", () => {
    for (const n of [2, 3, 4]) {
      for (let seed = 1; seed <= 200; seed++) {
        const g = new Game(n, seed);
        g.start();
        const s = g.state;
        const targets = Object.keys(s.assignments).sort();
        const pickers = Object.values(s.assignments)
          .map((a) => a.pickerId)
          .sort();
        const ids = s.players.map((p) => p.id).sort();
        expect(targets).toEqual(ids);
        expect(pickers).toEqual(ids);
        for (const [t, a] of Object.entries(s.assignments))
          expect(a.pickerId).not.toBe(t);
      }
    }
  });

  it("follows a shuffled turn order: each picks for the next one, and the order changes match to match", () => {
    const rings = new Set<string>();
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const g = new Game(4, seed);
      g.start();
      const { order, assignments } = g.state;
      order.forEach((id, i) => {
        expect(assignments[order[(i + 1) % order.length]].pickerId).toBe(id);
      });
      // the same ring, whoever it starts with
      const from = order.indexOf("p1");
      rings.add([...order.slice(from), ...order.slice(0, from)].join());
      firsts.add(order[0]);
    }
    // 4 players sit in 6 different rings, and anyone can go first
    expect(rings.size).toBe(6);
    expect(firsts.size).toBe(4);
  });
});

describe("picking", () => {
  it("starts the turns once everyone picked", () => {
    const g = new Game(3);
    g.start();
    g.pickAll();
    expect(g.state.phase).toBe("asking");
    expect(g.state.turnPlayerId).toBe(g.state.order[0]);
    expect(g.state.deadline).toBe(g.now + ASK);
  });

  it("refuses a second pick and picks outside the phase", () => {
    const g = new Game(2);
    expect(
      code(() => g.do({ type: "PICK", playerId: "p1", character: char("x") })),
    ).toBe("wrong_phase");
    g.start();
    g.do({ type: "PICK", playerId: "p1", character: char("x") });
    expect(
      code(() => g.do({ type: "PICK", playerId: "p1", character: char("y") })),
    ).toBe("already_done");
  });

  it("the clock fills missing picks with unused fallbacks", () => {
    const g = new Game(3);
    g.start();
    g.do({ type: "PICK", playerId: "p1", character: char("used") });
    expect(code(() => g.timeout({ fallbackCharacters: [char("used")] }))).toBe(
      "invalid_input",
    );
    g.timeout({ fallbackCharacters: [char("used"), char("f1"), char("f2")] });
    const ids = Object.values(g.state.assignments)
      .map((a) => a.character?.id)
      .sort();
    expect(ids).toEqual(["f1", "f2", "used"]);
    // only the clock's picks are marked, so they don't count as popular choices
    const auto = Object.values(g.state.assignments)
      .filter((a) => a.auto)
      .map((a) => a.character?.id)
      .sort();
    expect(auto).toEqual(["f1", "f2"]);
    expect(g.state.phase).toBe("asking");
  });
});

function started(n: number, seed = 7) {
  const g = new Game(n, seed);
  g.start();
  g.pickAll();
  return g;
}

describe("step times", () => {
  const times = {
    askSeconds: 40,
    answerSeconds: 100,
    guessSeconds: 50,
    validateSeconds: 70,
  };
  const timed = (n: number) => {
    const g = new Game(n, 7, times);
    g.start();
    g.pickAll();
    return g;
  };

  it("each step runs on its own clock; picking always gets PICK_SECONDS", () => {
    const g = new Game(3, 7, times);
    g.start();
    expect(g.state.phase).toBe("picking");
    expect((g.state.deadline ?? 0) - (g.state.stepStartsAt ?? 0)).toBe(
      PICK_SECONDS * 1000,
    );
    g.pickAll();
    expect(g.state.deadline).toBe(g.now + 40_000);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Is it human?" });
    expect(g.state.deadline).toBe(g.now + 100_000);
    for (const id of g.state.order.filter((id) => id !== asker))
      g.do({ type: "ANSWER", playerId: id, value: "no", note: null });
    expect(g.state.phase).toBe("guessing");
    expect(g.state.deadline).toBe(g.now + 50_000);
    g.do({ type: "GUESS", playerId: asker, text: "Someone else" });
    expect(g.state.phase).toBe("validating");
    expect(g.state.deadline).toBe(g.now + 70_000);
    expect(g.state.stepMs).toBe(70_000);
  });

  it("every answer that leaves others to answer cuts 20% of the answer time", () => {
    // the user's example: 4 players, 100 s to answer
    const g = timed(4);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Is it human?" });
    const start = g.now;
    const [a, b, c] = g.state.order.filter((id) => id !== asker);
    g.now += 20_000; // 80 s left
    g.do({ type: "ANSWER", playerId: a, value: "yes", note: null });
    expect(g.state.deadline).toBe(start + 80_000); // 60 s left
    g.do({ type: "ANSWER", playerId: b, value: "no", note: null });
    expect(g.state.deadline).toBe(start + 60_000); // 40 s left
    // the full length stays, so the clock can show what was cut
    expect(g.state.stepMs).toBe(100_000);
    expect(toView(g.state, 1, asker, g.now).stepMs).toBe(100_000);
    // the last one still answers in time, or the clock runs out on them
    g.timeout();
    expect(g.state.phase).toBe("guessing");
    expect(g.state.plays[0]).toMatchObject({ open: false });
    expect(
      (g.state.plays[0] as { answers: { by: string; value: string }[] })
        .answers,
    ).toContainEqual(expect.objectContaining({ by: c, value: "unknown" }));
  });

  it("a cut never leaves less than ANSWER_CUT_FLOOR_MS, nor adds time", () => {
    const g = timed(4);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Is it human?" });
    const [a, b] = g.state.order.filter((id) => id !== asker);
    g.now = (g.state.deadline ?? 0) - 15_000; // 15 s left, a cut would take 20
    g.do({ type: "ANSWER", playerId: a, value: "yes", note: null });
    expect(g.state.deadline).toBe(g.now + ANSWER_CUT_FLOOR_MS);
    g.now += 5_000; // 5 s left: already under the floor, nothing changes
    const before = g.state.deadline;
    g.do({ type: "ANSWER", playerId: b, value: "yes", note: null });
    expect(g.state.deadline).toBe(before);
  });

  it("the last answer closes the step instead of cutting it", () => {
    const g = timed(2);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Is it human?" });
    const other = g.state.order.find((id) => id !== asker) as string;
    g.do({ type: "ANSWER", playerId: other, value: "yes", note: null });
    expect(g.state.phase).toBe("guessing");
    expect(g.state.deadline).toBe(g.now + 50_000);
  });

  it("rooms saved with the old single time get the defaults and lose the old key", () => {
    const g = new Game(2);
    const {
      askSeconds: _a,
      guessSeconds: _g,
      answerSeconds: _n,
      validateSeconds: _v,
      ...rest
    } = g.state.settings;
    g.state = {
      ...g.state,
      settings: {
        ...rest,
        stepSeconds: 120,
      } as unknown as RoomState["settings"],
    };
    expect(toView(g.state, 1, "p1", g.now).settings).toMatchObject({
      askSeconds: 90,
      validateSeconds: 60,
    });
    expect(toView(g.state, 1, "p1", g.now).settings).not.toHaveProperty(
      "stepSeconds",
    );
    g.start();
    g.pickAll();
    expect(g.state.deadline).toBe(g.now + 90_000);
  });
});

describe("a turn", () => {
  it("asking validates the asker and the text", () => {
    const g = started(2);
    const other = g.state.order[1];
    expect(
      code(() => g.do({ type: "ASK", playerId: other, text: "Hi?" })),
    ).toBe("not_your_turn");
    expect(
      code(() => g.do({ type: "ASK", playerId: g.turn, text: "   " })),
    ).toBe("invalid_input");
    expect(
      code(() =>
        g.do({ type: "ASK", playerId: g.turn, text: "x".repeat(141) }),
      ),
    ).toBe("invalid_input");
  });

  it("a question always ends with a question mark", () => {
    const g = started(2);
    expect(
      code(() => g.do({ type: "ASK", playerId: g.turn, text: " ?？ " })),
    ).toBe("invalid_input");
    // one short of the limit still has room for the mark; at the limit it does not
    expect(
      code(() =>
        g.do({ type: "ASK", playerId: g.turn, text: "x".repeat(140) }),
      ),
    ).toBe("invalid_input");
    g.do({ type: "ASK", playerId: g.turn, text: "Am I real" });
    expect(g.state.plays.at(-1)).toMatchObject({ text: "Am I real?" });

    const h = started(2);
    h.do({ type: "ASK", playerId: h.turn, text: "人間ですか？" });
    expect(h.state.plays.at(-1)).toMatchObject({ text: "人間ですか？" });
  });

  it("everyone else answers, then the next step starts under the reveal", () => {
    const g = started(4);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Is it human?" });
    expect(g.state.phase).toBe("answering");
    expect(
      code(() =>
        g.do({ type: "ANSWER", playerId: asker, value: "yes", note: null }),
      ),
    ).toBe("not_your_turn");
    const others = g.state.order.filter((id) => id !== asker);
    g.do({ type: "ANSWER", playerId: others[0], value: "yes", note: "  " });
    expect(
      code(() =>
        g.do({ type: "ANSWER", playerId: others[0], value: "no", note: null }),
      ),
    ).toBe("already_done");
    g.do({ type: "ANSWER", playerId: others[1], value: "no", note: null });
    expect(g.state.phase).toBe("answering");
    g.do({
      type: "ANSWER",
      playerId: others[2],
      value: "probably_yes",
      note: "half",
    });
    const s = g.state;
    expect(s.phase).toBe("guessing");
    expect(s.plays[0]).toMatchObject({ open: false });
    expect(s.reveal).toMatchObject({ kind: "answers", n: 1, startsAt: g.now });
    const ms =
      REVEAL_TIMING.answersBase +
      3 * REVEAL_TIMING.perAnswer +
      4 * REVEAL_TIMING.perNoteChar;
    expect(s.reveal?.until).toBe(g.now + ms);
    // no pause: the clock runs while the reveal is up, and the player can act
    expect(s.stepStartsAt).toBe(g.now);
    expect(s.deadline).toBe(g.now + GUESS);
    g.do({ type: "PASS", playerId: asker });
    expect(g.state.phase).toBe("asking");
  });

  it("answers reveals last at least 6 s and at most 10 s", () => {
    const two = started(2);
    two.askAndAnswer();
    const r2 = two.state.reveal;
    expect((r2?.until ?? 0) - (r2?.startsAt ?? 0)).toBe(
      REVEAL_TIMING.answersMin,
    );

    const g = started(4);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Long notes?" });
    for (const id of g.state.order.filter((x) => x !== asker)) {
      g.do({
        type: "ANSWER",
        playerId: id,
        value: "yes",
        note: "x".repeat(200),
      });
    }
    const r = g.state.reveal;
    expect((r?.until ?? 0) - (r?.startsAt ?? 0)).toBe(REVEAL_TIMING.answersMax);
  });

  it("a close guess is a hit with a reveal; the same turn round ties", () => {
    const g = started(3);
    const first = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: first, text: `name ${first}` });
    const s = g.state;
    expect(s.plays.at(-1)).toMatchObject({ kind: "guess", result: "hit" });
    expect(s.outcomes[first]).toEqual({
      discoveredAt: 2,
      place: 1,
      round: 1,
      gaveUp: false,
      endedAt: g.now,
    });
    expect(s.playStartedAt).not.toBeNull();
    expect(s.reveal).toMatchObject({ kind: "guess", n: 2 });
    expect((s.reveal?.until ?? 0) - g.now).toBe(REVEAL_TIMING.guessHit);
    expect(s.phase).toBe("asking");
    expect(s.turnPlayerId).not.toBe(first);
    expect(s.stepStartsAt).toBe(g.now);

    // the next player had no turn before the first one hit: same round, same place
    const second = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: second, text: `Nane ${second}` }); // one typo
    expect(g.state.outcomes[second]).toMatchObject({ place: 1, round: 1 });
    expect(g.state.reveal).toMatchObject({ kind: "guess" });
    expect(toView(g.state, 1, second, g.now).reveal).toMatchObject({
      place: 1,
      tied: true,
    });
  });

  it("a match saved before ties existed keeps counting places up", () => {
    const g = started(3);
    const [a, b] = g.state.order;
    expect(g.askAndAnswer()).toBe(a);
    g.do({ type: "GUESS", playerId: a, text: `name ${a}` });
    // what an older save looks like: no turn rounds anywhere
    delete g.state.turnRound;
    for (const o of Object.values(g.state.outcomes)) delete o.round;
    expect(g.askAndAnswer()).toBe(b);
    g.do({ type: "GUESS", playerId: b, text: `name ${b}` });
    expect(g.state.outcomes[b].place).toBe(2);
  });

  it("whoever already had their turn in that round does not tie", () => {
    const g = started(3);
    const [a, b, c] = g.state.order;
    // a misses in round 1; b discovers in round 1
    expect(g.askAndAnswer()).toBe(a);
    g.do({ type: "PASS", playerId: a });
    expect(g.askAndAnswer()).toBe(b);
    g.do({ type: "GUESS", playerId: b, text: `name ${b}` });
    expect(g.state.outcomes[b]).toMatchObject({ place: 1, round: 1 });
    // c still had a round-1 turn, but passes; a and c then discover in round 2
    expect(g.askAndAnswer()).toBe(c);
    g.do({ type: "PASS", playerId: c });
    expect(g.askAndAnswer()).toBe(a);
    g.do({ type: "GUESS", playerId: a, text: `name ${a}` });
    expect(g.state.outcomes[a]).toMatchObject({ place: 2, round: 2 });
    expect(g.askAndAnswer()).toBe(c);
    g.do({ type: "GUESS", playerId: c, text: `name ${c}` });
    expect(g.state.outcomes[c]).toMatchObject({ place: 2, round: 2 });
    expect(g.state.phase).toBe("finished");
  });

  it("a far guess goes to the player who picked that character", () => {
    const g = started(3);
    const guesser = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: guesser, text: "Someone else" });
    expect(g.state.phase).toBe("validating");
    const validator = g.state.assignments[guesser].pickerId;
    const bystander = g.state.order.find(
      (id) => id !== guesser && id !== validator,
    ) as string;
    expect(
      code(() =>
        g.do({ type: "VALIDATE", playerId: bystander, correct: true }),
      ),
    ).toBe("not_your_turn");
    expect(
      code(() => g.do({ type: "VALIDATE", playerId: guesser, correct: true })),
    ).toBe("not_your_turn");
    g.do({ type: "VALIDATE", playerId: validator, correct: false });
    expect(g.state.plays.at(-1)).toMatchObject({ result: "miss" });
    expect((g.state.reveal?.until ?? 0) - g.now).toBe(REVEAL_TIMING.guessMiss);
    expect(g.state.phase).toBe("asking");
  });

  it("a stand-in validates when the picker left", () => {
    const g = started(3);
    const guesser = g.state.order[0];
    const picker = g.state.assignments[guesser].pickerId;
    g.do({ type: "LEAVE", playerId: picker });
    g.askAndAnswer();
    g.do({ type: "GUESS", playerId: guesser, text: "Someone else" });
    const standIn = g.state.order.find(
      (id) => id !== guesser && id !== picker,
    ) as string;
    g.do({ type: "VALIDATE", playerId: standIn, correct: true });
    expect(g.state.outcomes[guesser].place).toBe(1);
  });

  it("a pass makes no new reveal", () => {
    const g = started(2);
    const asker = g.askAndAnswer();
    const before = g.state.reveal;
    g.do({ type: "PASS", playerId: asker });
    expect(g.state.reveal).toEqual(before);
    expect(g.state.stepStartsAt).toBe(g.now);
  });
});

describe("the clock", () => {
  it("fills missing answers, passes, misses and strikes out", () => {
    const g = started(3);
    const asker = g.turn;
    g.do({ type: "ASK", playerId: asker, text: "Q?" });
    g.timeout();
    const q = g.state.plays[0];
    expect(
      q.kind === "question" && q.answers.every((a) => a.value === "unknown"),
    ).toBe(true);
    expect(g.state.phase).toBe("guessing");

    g.timeout();
    expect(g.state.phase).toBe("asking");
    expect(g.state.turnPlayerId).not.toBe(asker);

    const g2 = started(3);
    const guesser = g2.askAndAnswer();
    g2.do({ type: "GUESS", playerId: guesser, text: "nobody" });
    g2.timeout();
    expect(g2.state.plays.at(-1)).toMatchObject({ result: "miss" });

    const g3 = started(3);
    const lazy = g3.turn;
    g3.timeout(); // strike 1
    while (g3.state.turnPlayerId !== lazy) g3.timeout();
    g3.timeout(); // strike 2
    const p = g3.state.players.find((x) => x.id === lazy);
    expect(p?.away).toBe(true);
    expect(g3.state.outcomes[lazy].gaveUp).toBe(true);
  });

  it("a host who leaves mid-match hands the room to the next present player", () => {
    const g = started(3);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.players.find((p) => p.id === "p1")?.away).toBe(true);
    expect(g.state.hostId).toBe("p2");
  });

  it("isExpired follows the deadline", () => {
    const g = started(2);
    expect(isExpired(g.state, g.now)).toBe(false);
    expect(isExpired(g.state, g.state.deadline as number)).toBe(true);
  });
});

describe("a guest signing in", () => {
  it("the account takes over the guest's seat, picks, plays and turn", () => {
    const g = new Game(3);
    g.start();
    g.pickAll();
    const asker = g.askAndAnswer();
    const account = { ...ident("acc"), isGuest: false, name: "Ana" };
    const pickedFor = Object.keys(g.state.assignments).find(
      (t) => g.state.assignments[t].pickerId === asker,
    ) as string;
    g.do({ type: "SWAP_PLAYER", from: asker, player: account });
    const s = g.state;
    const ids = s.players.map((p) => p.id);
    expect(ids).toContain("acc");
    expect(ids).not.toContain(asker);
    expect(s.players.find((p) => p.id === "acc")?.name).toBe("Ana");
    expect(s.order).toContain("acc");
    expect(s.turnPlayerId).toBe("acc");
    expect(s.assignments.acc).toBeDefined();
    expect(s.assignments[pickedFor].pickerId).toBe("acc");
    expect(s.outcomes.acc).toBeDefined();
    expect(s.plays.every((p) => p.by !== asker)).toBe(true);
    expect(JSON.stringify(s)).not.toContain(`"${asker}"`);
  });

  it("refuses when the account already sits there, or the guest doesn't", () => {
    const g = new Game(2);
    expect(
      code(() =>
        g.do({ type: "SWAP_PLAYER", from: "p1", player: ident("p2") }),
      ),
    ).toBe("already_done");
    expect(
      code(() =>
        g.do({ type: "SWAP_PLAYER", from: "ghost", player: ident("acc") }),
      ),
    ).toBe("not_member");
    g.do({ type: "SWAP_PLAYER", from: "p1", player: ident("acc") });
    expect(g.state.hostId).toBe("acc");
  });
});

describe("leaving and giving up", () => {
  it("giving up on your turn moves on; twice is refused", () => {
    const g = started(3);
    const t = g.turn;
    g.do({ type: "GIVE_UP", playerId: t });
    expect(g.state.outcomes[t].gaveUp).toBe(true);
    expect(g.state.turnPlayerId).not.toBe(t);
    expect(code(() => g.do({ type: "GIVE_UP", playerId: t }))).toBe(
      "already_done",
    );
  });

  it("an away player's answer is filled in at once", () => {
    const g = started(3);
    const asker = g.turn;
    const leaver = g.state.order.find((id) => id !== asker) as string;
    g.do({ type: "LEAVE", playerId: leaver });
    g.do({ type: "ASK", playerId: asker, text: "Q?" });
    const q = g.state.plays[0];
    expect(q.kind === "question" && q.answers.map((a) => a.by)).toEqual([
      leaver,
    ]);
  });

  it("the match ends when fewer than two remain", () => {
    const g = started(2);
    g.do({ type: "LEAVE", playerId: g.state.order[1] });
    expect(g.state.phase).toBe("finished");
    expect(g.state.deadline).toBe(g.now + RESULT_SECONDS * 1000);
  });
});

function playToEnd(g: Game) {
  let guard = 0;
  while (g.state.phase !== "finished" && guard++ < 100) {
    const t = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: t, text: `Name ${t}` });
  }
  return g.state;
}

describe("whole matches", () => {
  it("2 players play to the end", () => {
    const s = playToEnd(started(2));
    expect(s.phase).toBe("finished");
    const places = Object.values(s.outcomes)
      .map((o) => o.place)
      .sort();
    // both discover on their first turn: a tie
    expect(places).toEqual([1, 1]);
    expect(s.reveal?.kind).toBe("guess");
  });

  it("4 players play to the end, go back to the lobby and play again", () => {
    const g = started(4);
    const s = playToEnd(g);
    expect(
      Object.values(s.outcomes)
        .map((o) => o.place)
        .sort(),
    ).toEqual([1, 1, 1, 1]);
    // the podium waits for the last reveal, then its own clock
    expect(s.stepStartsAt).toBe(s.reveal?.until);
    expect(s.deadline).toBe((s.stepStartsAt ?? 0) + RESULT_SECONDS * 1000);
    expect(code(() => g.do({ type: "BACK_TO_LOBBY", playerId: "p2" }))).toBe(
      "not_host",
    );
    g.do({ type: "BACK_TO_LOBBY", playerId: s.hostId });
    expect(g.state.phase).toBe("lobby");
    expect(g.state.deadline).toBe(g.now + LOBBY_SECONDS * 1000);
    expect(g.state.players.map((p) => p.ready)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(g.state.assignments).toEqual({});
    expect(g.state.plays).toEqual([]);
    g.do({ type: "START", playerId: s.hostId, themes: THEMES });
    expect(g.state.phase).toBe("voting");
    expect(g.state.reveal).toBeNull();
    g.voteAll(2);
    expect(g.state.phase).toBe("picking");
    expect(g.state.theme?.en).toBe("Pirates");
    expect(g.state.round).toBe(2);
    expect(g.state.plays).toEqual([]);
    expect(g.state.reveal?.kind).toBe("theme");
  });

  it("without the host, the podium's clock takes everyone back; whoever left loses the seat", () => {
    const g = started(3);
    const leaver = g.state.order[0];
    g.do({ type: "LEAVE", playerId: leaver });
    for (const id of g.state.order)
      if (id !== leaver && g.state.phase !== "finished")
        g.do({ type: "GIVE_UP", playerId: id });
    expect(g.state.phase).toBe("finished");
    expect(code(() => g.do({ type: "TIMEOUT" }))).toBe("wrong_phase");
    g.timeout();
    expect(g.state.phase).toBe("lobby");
    expect(g.state.players.map((p) => p.id)).not.toContain(leaver);
    expect(g.state.players.some((p) => p.id === g.state.hostId)).toBe(true);
  });

  it("never mutates the state it was given", () => {
    const g = started(3);
    const before: RoomState = structuredClone(g.state);
    const frozen = JSON.stringify(g.state);
    reduce(g.state, { type: "ASK", playerId: g.turn, text: "Q?" }, g.ctx());
    expect(JSON.stringify(g.state)).toBe(frozen);
    expect(g.state).toEqual(before);
  });
});

describe("closed pages", () => {
  it("a lobby frees the seat of a closed page, unless it opens again in time", () => {
    const g = new Game(3);
    g.do({ type: "GONE", playerId: "p1" });
    g.do({ type: "GONE", playerId: "p2" });
    // a reload: back before the grace is over
    g.now += GONE_GRACE_MS - 1;
    g.do({ type: "BACK", playerId: "p2" });
    expect(presenceDue(g.state, g.now)).toBe(false);
    expect(code(() => g.do({ type: "SWEEP" }))).toBe("wrong_phase");
    g.now += 1;
    expect(presenceDue(g.state, g.now)).toBe(true);
    g.do({ type: "SWEEP" });
    expect(g.state.players.map((p) => p.id)).toEqual(["p2", "p3"]);
    // the host was gone: the room goes to whoever joined next
    expect(g.state.hostId).toBe("p2");
  });

  it("a match waits for closed pages, and closes once every page is closed", () => {
    const g = started(3);
    const [a, b, c] = g.state.order;
    g.do({ type: "GONE", playerId: a });
    g.do({ type: "GONE", playerId: b });
    g.now += GONE_GRACE_MS * 10;
    // one page still open: everyone keeps their seat
    expect(presenceDue(g.state, g.now)).toBe(false);
    expect(g.state.players.every((p) => !p.away)).toBe(true);
    g.do({ type: "GONE", playerId: c });
    g.now += GONE_GRACE_MS - 1;
    expect(abandoned(g.state, g.now)).toBe(false);
    g.now += 1;
    expect(abandoned(g.state, g.now)).toBe(true);
    g.do({ type: "SWEEP" });
    expect(g.state.phase).toBe("closed");
    expect(g.state.deadline).toBeNull();
  });

  it("someone who left the match does not keep it open", () => {
    const g = started(3);
    const [a, b, c] = g.state.order;
    g.do({ type: "LEAVE", playerId: a });
    g.do({ type: "GONE", playerId: b });
    g.do({ type: "GONE", playerId: c });
    g.now += GONE_GRACE_MS;
    g.do({ type: "SWEEP" });
    expect(g.state.phase).toBe("closed");
  });
});
