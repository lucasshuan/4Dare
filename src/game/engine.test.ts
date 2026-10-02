import { describe, expect, it } from "vitest";
import { createRoom, isExpired, reduce } from "./engine";
import { char, Game, ident, THEMES } from "./test-utils";
import {
  DEFAULT_SETTINGS,
  GameError,
  LOBBY_SECONDS,
  REVEAL_TIMING,
  type RoomState,
  VOTE_SECONDS,
} from "./types";

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    if (e instanceof GameError) return e.code;
    throw e;
  }
  return "no error";
};

const STEP = DEFAULT_SETTINGS.stepSeconds * 1000;

describe("lobby", () => {
  it("creates a room with the host seated and the lobby clock running", () => {
    const g = new Game(1);
    const s = g.state;
    expect(s.phase).toBe("lobby");
    expect(s.players).toHaveLength(1);
    expect(s.players[0]).toMatchObject({ id: "p1", ready: true, away: false });
    expect(s.deadline).toBe(g.now + LOBBY_SECONDS * 1000);
    expect(s.stepStartsAt).toBe(g.now);
    expect(s.reveal).toBeNull();
  });

  it("rejects invalid settings", () => {
    const ctx = { now: 0, random: Math.random };
    const bad = [
      { seats: 5 },
      { stepSeconds: 10 },
      { stepSeconds: 301 },
      { stepSeconds: 60.5 },
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

  it("joining twice refreshes the identity instead of failing", () => {
    const g = new Game(2);
    g.do({ type: "JOIN", player: { ...ident("p2"), name: "Bia" } });
    expect(g.state.players).toHaveLength(2);
    expect(g.state.players[1].name).toBe("Bia");
  });

  it("hands the room to the next player when the host leaves, and closes when empty", () => {
    const g = new Game(2);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.hostId).toBe("p2");
    expect(g.state.players[0].ready).toBe(true);
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
    expect(upd("p1", { stepSeconds: 29 })).toBe("invalid_input");
    expect(upd("p1", { color: "red" })).toBe("invalid_input");
    g.do({
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { stepSeconds: 60, visibility: "private" },
    });
    expect(g.state.settings).toMatchObject({
      stepSeconds: 60,
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

  it("the lobby clock starts the match with 2+ players and closes it with one", () => {
    const g = new Game(2);
    expect(code(() => g.do({ type: "TIMEOUT", themes: THEMES }))).toBe(
      "wrong_phase",
    );
    expect(code(() => g.timeout())).toBe("invalid_input");
    g.timeout({ themes: THEMES });
    expect(g.state.phase).toBe("voting");

    const lonely = new Game(1);
    lonely.timeout({ themes: THEMES });
    expect(lonely.state.phase).toBe("closed");
    expect(lonely.state.deadline).toBeNull();
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
    expect(h.state.deadline).toBe(h.now + LOBBY_SECONDS * 1000);
  });

  it("the host leaving hands the room over and the vote goes on", () => {
    const g = voting(3);
    g.do({ type: "LEAVE", playerId: "p1" });
    expect(g.state.phase).toBe("voting");
    expect(g.state.hostId).toBe("p2");
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
});

describe("picking", () => {
  it("starts the turns once everyone picked", () => {
    const g = new Game(3);
    g.start();
    g.pickAll();
    expect(g.state.phase).toBe("asking");
    expect(g.state.turnPlayerId).toBe(g.state.order[0]);
    expect(g.state.deadline).toBe(g.now + STEP);
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

  it("everyone else answers, then a reveal holds the next step's clock", () => {
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
    expect(s.stepStartsAt).toBe(g.now + ms);
    expect(s.deadline).toBe(g.now + ms + STEP);
    expect(code(() => g.do({ type: "PASS", playerId: asker }))).toBe(
      "too_early",
    );
    g.now = s.stepStartsAt as number;
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

  it("a close guess is a hit with a reveal; places count up", () => {
    const g = started(3);
    const first = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: first, text: `name ${first}` });
    const s = g.state;
    expect(s.plays.at(-1)).toMatchObject({ kind: "guess", result: "hit" });
    expect(s.outcomes[first]).toEqual({
      discoveredAt: 2,
      place: 1,
      gaveUp: false,
      endedAt: g.now,
    });
    expect(s.playStartedAt).not.toBeNull();
    expect(s.reveal).toMatchObject({ kind: "guess", n: 2 });
    expect((s.reveal?.until ?? 0) - g.now).toBe(REVEAL_TIMING.guessHit);
    expect(s.phase).toBe("asking");
    expect(s.turnPlayerId).not.toBe(first);
    expect(s.stepStartsAt).toBe(s.reveal?.until);

    const second = g.askAndAnswer();
    g.do({ type: "GUESS", playerId: second, text: `Nane ${second}` }); // one typo
    expect(g.state.outcomes[second].place).toBe(2);
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
    expect(g.state.deadline).toBeNull();
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
    expect(places).toEqual([1, 2]);
    expect(s.reveal?.kind).toBe("guess");
  });

  it("4 players play to the end, then the host plays again", () => {
    const g = started(4);
    const s = playToEnd(g);
    expect(
      Object.values(s.outcomes)
        .map((o) => o.place)
        .sort(),
    ).toEqual([1, 2, 3, 4]);
    expect(
      code(() => g.do({ type: "REMATCH", playerId: "p2", themes: THEMES })),
    ).toBe("not_host");
    g.do({ type: "REMATCH", playerId: s.hostId, themes: THEMES });
    expect(g.state.phase).toBe("voting");
    expect(g.state.reveal).toBeNull();
    g.voteAll(2);
    expect(g.state.phase).toBe("picking");
    expect(g.state.theme?.en).toBe("Pirates");
    expect(g.state.round).toBe(2);
    expect(g.state.plays).toEqual([]);
    expect(g.state.reveal?.kind).toBe("theme");
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
