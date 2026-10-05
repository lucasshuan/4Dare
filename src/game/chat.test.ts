import { describe, expect, it } from "vitest";
import {
  type ChatMessage,
  cleanChatText,
  countUnread,
  MAX_CHAT,
  reassignMessage,
  systemLines,
  visibleChat,
} from "./chat";
import { char, Game, ident, THEMES } from "./test-utils";
import { type Reveal, type RoomState, SHOW_MARKS } from "./types";

/** Applies `step` and returns the lines it posts. */
function linesOf(g: Game, step: () => void) {
  const before = structuredClone(g.state);
  step();
  return systemLines(before, g.state, g.now, g.showScale);
}

const beat = (r: Reveal | null | undefined, kind: string) => {
  const b = r?.beats?.find((x) => x.kind === kind);
  if (!b) throw new Error(`no ${kind} beat`);
  return b;
};

/** A started match, the opening played out, still voting. */
function voting(players = 3) {
  const g = new Game(players);
  g.do({ type: "START", playerId: "p1", themes: THEMES });
  g.skipShow();
  return g;
}

describe("system lines", () => {
  it("posts 'started' when the match starts, as the opening starts", () => {
    const g = new Game(2);
    const lines = linesOf(g, () =>
      g.do({ type: "START", playerId: "p1", themes: THEMES }),
    );
    expect(lines).toEqual([
      { system: { type: "started" }, showAt: g.state.reveal?.startsAt },
    ]);
    // a host who types the theme: the same line
    const h = new Game(2, 1, { themeMode: "host" });
    expect(
      linesOf(h, () => h.do({ type: "START", playerId: "p1", themes: [] })),
    ).toEqual([
      { system: { type: "started" }, showAt: h.state.reveal?.startsAt },
    ]);
  });

  it("posts the theme when the theme beat shows it, in the future", () => {
    const g = voting();
    const lines = linesOf(g, () => g.voteAll(0));
    const theme = beat(g.state.reveal, "theme");
    expect(lines).toEqual([
      {
        system: { type: "theme", theme: THEMES[0] },
        showAt: theme.startsAt + SHOW_MARKS.themeLine,
      },
    ]);
    expect(lines[0].showAt).toBeGreaterThan(g.now);
  });

  it("waits for the tie roulette and the settle before the theme line", () => {
    const g = voting(3);
    const lines = linesOf(g, () => {
      g.do({ type: "VOTE", playerId: "p1", option: 0 });
      g.do({ type: "VOTE", playerId: "p2", option: 1 });
      g.do({ type: "VOTE", playerId: "p3", option: 2 });
    });
    const tie = beat(g.state.reveal, "tie_spin");
    const theme = beat(g.state.reveal, "theme");
    expect(theme.startsAt).toBeGreaterThan(tie.until - 1);
    expect(lines).toHaveLength(1);
    expect(lines[0].showAt).toBe(theme.startsAt + SHOW_MARKS.themeLine);
    expect(lines[0].showAt).toBeGreaterThan(tie.until);
  });

  it("scales its moment with the show and keeps it inside the beat", () => {
    const g = voting();
    g.showScale = 0.25;
    const [line] = linesOf(g, () => g.voteAll(0));
    const theme = beat(g.state.reveal, "theme");
    expect(line.showAt).toBe(
      theme.startsAt + Math.round(SHOW_MARKS.themeLine * 0.25),
    );
    expect(line.showAt).toBeLessThanOrEqual(theme.until);
  });

  it("posts a typed theme too, when it takes the stage", () => {
    const g = new Game(2, 1, { themeMode: "host" });
    g.do({ type: "START", playerId: "p1", themes: [] });
    g.skipShow();
    const [line] = linesOf(g, () =>
      g.do({ type: "SET_THEME", playerId: "p1", text: "Space pirates" }),
    );
    expect(line).toMatchObject({
      system: {
        type: "theme",
        theme: { en: "Space pirates", set: null },
      },
    });
    expect(line.showAt).toBe(
      beat(g.state.reveal, "theme").startsAt + SHOW_MARKS.themeLine,
    );
  });

  it("posts the order and the first turn once picking ends", () => {
    const g = voting(3);
    g.voteAll(0);
    g.skipReveal();
    const lines = linesOf(g, () => g.pickAll());
    const cast = g.state.reveal;
    const order = beat(cast, "order");
    expect(lines).toHaveLength(2);
    const [orderLine, turnLine] = lines;
    if (!("system" in orderLine) || orderLine.system.type !== "order")
      throw new Error("no order line");
    expect(orderLine.system.players.map((p) => p.id)).toEqual(g.state.order);
    expect(orderLine.system.players[0]).toEqual({
      id: g.state.order[0],
      isGuest: false,
      name: g.state.order[0],
      guestNumber: 10,
      avatar: { kind: "critter", seed: "x", color: "#DCE8FA" },
    });
    expect(orderLine.showAt).toBe(order.startsAt + SHOW_MARKS.orderLine.first);
    expect(turnLine).toEqual({
      system: {
        type: "firstTurn",
        n: 1,
        player: expect.objectContaining({ id: g.state.turnPlayerId }),
      },
      showAt: (cast?.until ?? 0) + SHOW_MARKS.turnLine,
    });
    // the turns going on post nothing more
    g.skipReveal();
    expect(linesOf(g, () => g.askAndAnswer())).toEqual([]);
  });

  it("posts the order after a pick timeout too, later matches with their own moment", () => {
    const g = voting(2);
    g.voteAll(0);
    g.skipReveal();
    const lines = linesOf(g, () =>
      g.timeout({ fallbackCharacters: [char("f1"), char("f2")] }),
    );
    expect(lines.map((l) => ("system" in l ? l.system.type : null))).toEqual([
      "order",
      "firstTurn",
    ]);
    // a second match: "later" marks, n = 2
    for (let i = 0; i < 4 && g.state.phase !== "finished"; i++)
      g.do({ type: "GIVE_UP", playerId: g.turn });
    g.do({ type: "BACK_TO_LOBBY", playerId: "p1" });
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    g.skipShow();
    g.voteAll(0);
    g.skipReveal();
    const later = linesOf(g, () => g.pickAll());
    expect(later[0].showAt).toBe(
      beat(g.state.reveal, "order").startsAt + SHOW_MARKS.orderLine.later,
    );
    expect(later[1]).toMatchObject({
      system: { type: "firstTurn", n: 2 },
    });
  });

  it("posts nothing for seat swaps, identity changes, drafts or reloads", () => {
    const g = voting(2);
    g.voteAll(0);
    g.skipReveal();
    const quiet = (s: () => RoomState) => expect(linesOf(g, s)).toEqual([]);
    quiet(() =>
      g.do({ type: "SWAP_PLAYER", from: "p2", player: ident("acct") }),
    );
    quiet(() =>
      g.do({
        type: "UPDATE_IDENTITY",
        player: { ...ident("p1"), name: "Bia" },
      }),
    );
    quiet(() =>
      g.do({
        type: "DRAFT",
        playerId: "p1",
        draft: {
          characterId: null,
          name: "Zorro",
          imageUrl: null,
          newId: null,
        },
      }),
    );
    quiet(() => g.do({ type: "GONE", playerId: "p1" }));
    quiet(() => g.do({ type: "BACK", playerId: "p1" }));
    // nor in the lobby
    const l = new Game(2);
    expect(
      linesOf(l, () => l.do({ type: "JOIN", player: ident("p3") })),
    ).toEqual([]);
    expect(linesOf(l, () => l.do({ type: "LEAVE", playerId: "p3" }))).toEqual(
      [],
    );
  });
});

describe("chat text", () => {
  it("trims, drops control characters, keeps line breaks and squashes blank runs", () => {
    expect(cleanChatText("  hi  ")).toBe("hi");
    expect(cleanChatText("a\u0000b\u0007c\u007f\u009bd")).toBe("abcd");
    expect(cleanChatText("a\tb")).toBe("a b");
    expect(cleanChatText("a\r\nb")).toBe("a\nb");
    expect(cleanChatText("a\n\n\n\n\nb")).toBe("a\n\nb");
    expect(cleanChatText(" \n\t ")).toBeNull();
    expect(cleanChatText(42)).toBeNull();
  });

  it("counts code points: 280 emoji fit, 281 don't", () => {
    expect(cleanChatText("🦸".repeat(MAX_CHAT))).toBe("🦸".repeat(MAX_CHAT));
    expect(cleanChatText("🦸".repeat(MAX_CHAT + 1))).toBeNull();
    expect(cleanChatText("x".repeat(MAX_CHAT + 1))).toBeNull();
  });
});

describe("chat order and unread", () => {
  const msg = (m: Partial<ChatMessage> & { id: number }): ChatMessage => ({
    at: 0,
    showAt: 0,
    by: "p2",
    author: null,
    text: "hi",
    system: null,
    ...m,
  });

  it("hides a system line until its scene and sorts by when it shows, then id", () => {
    const started = { type: "started" } as const;
    const lines = [
      msg({ id: 3, at: 100, showAt: 100 }),
      msg({
        id: 1,
        at: 50,
        showAt: 500,
        by: null,
        text: null,
        system: started,
      }),
      msg({ id: 2, at: 100, showAt: 100 }),
      // a player's line shows at once, even a hair before its database time
      msg({ id: 4, at: 150, showAt: 300 }),
    ];
    expect(visibleChat(lines, 200).map((m) => m.id)).toEqual([2, 3, 4]);
    expect(visibleChat(lines, 500).map((m) => m.id)).toEqual([2, 3, 4, 1]);
  });

  it("counts others' visible lines past the last seen; system lines never", () => {
    const lines = [
      msg({ id: 1 }),
      msg({ id: 2 }),
      msg({ id: 3, by: "p1" }),
      msg({ id: 4, by: null, text: null }),
      msg({ id: 5, showAt: 999 }),
    ];
    expect(countUnread(lines, 1, "p1", 100)).toBe(2);
    expect(countUnread(lines, 0, "p1", 1000)).toBe(3);
  });

  it("moves a guest's lines and the lines naming them to the account", () => {
    const person = {
      id: "g",
      isGuest: true,
      name: null,
      guestNumber: 7,
      avatar: { kind: "critter", seed: "x", color: "#fff" } as const,
    };
    const other = { ...person, id: "x" };
    expect(
      reassignMessage(msg({ id: 1, by: "g", author: person }), "g", "acct"),
    ).toMatchObject({ by: "acct", author: { id: "acct", guestNumber: 7 } });
    expect(
      reassignMessage(
        msg({
          id: 2,
          by: null,
          text: null,
          system: { type: "order", players: [other, person] },
        }),
        "g",
        "acct",
      ).system,
    ).toEqual({
      type: "order",
      players: [other, { ...person, id: "acct" }],
    });
  });
});
