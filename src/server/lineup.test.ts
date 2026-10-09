// What for?'s deal in local mode: the fixture library and the banks' first lots.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRoom, reduce } from "@/game/engine";
import { lotsFor } from "@/game/lineup/rules";
import { ident, rng } from "@/game/test-utils";
import { DEFAULT_SETTINGS, GameError } from "@/game/types";

process.env.DARE_DATA_DIR = mkdtempSync(join(tmpdir(), "dare-lineup-"));

const { lineupDecks, paperCard, queueLots } = await import("./lineup");
const { getBackend } = await import("./backend");

const room = (players: number, settings = {}) => {
  const ctx = { now: 1000, random: rng(1) };
  let s = createRoom(
    "ABCDE",
    ident("p1"),
    { ...DEFAULT_SETTINGS, game: "lineup", seats: 6, ...settings },
    ctx,
  );
  for (let i = 2; i <= players; i++)
    s = reduce(s, { type: "JOIN", player: ident(`p${i}`) }, ctx);
  return s;
};

describe("what for?: the deal", () => {
  it("deals for the open seats and the most rounds, with a mission each", async () => {
    const state = room(3);
    const decks = await lineupDecks(state, rng(4));
    expect(decks).toHaveLength(2);
    const lots = lotsFor(6, 3);
    for (const d of decks) {
      expect(d.lots).toBe(lots);
      // one spare a seat
      expect(d.cards).toHaveLength(lots + 6);
      expect(d.cards[3].id).toMatch(/^x:/);
      expect(d.cards[3].emoji).toBeTruthy();
      expect(d.cards[0].imageUrl).toMatch(/^https:/);
      expect(d.mission.text.pt).toBeTruthy();
    }
    expect(decks[0].mission.id).not.toBe(decks[1].mission.id);
    const ids = decks.flatMap((d) => d.cards.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    // the engine takes what the table needs
    const started = reduce(
      state,
      { type: "START", playerId: "p1", decks },
      { now: 2000, random: rng(2) },
    );
    expect(started.lu?.decks[0].lots).toBe(lotsFor(3, 3));
    expect(started.lu?.decks).toHaveLength(2);
  });

  it("refuses to deal from tastes with too few characters", async () => {
    const state = room(2, {
      offTastes: [
        "anime",
        "animation",
        "live",
        "games",
        "comics",
        "books",
        "real",
      ],
    });
    await expect(lineupDecks(state)).rejects.toEqual(
      new GameError("few_cards"),
    );
  });
});

describe("what for?: with a presenter", () => {
  it("deals three missions a round to choose from", async () => {
    const decks = await lineupDecks(room(4, { mode: "host" }), rng(4));
    for (const d of decks) {
      expect(d.options).toHaveLength(3);
      expect(d.mission).toEqual(d.options?.[0]);
    }
    const all = decks.flatMap((d) => d.options?.map((m) => m.id) ?? []);
    expect(new Set(all).size).toBe(all.length);
  });

  it("makes a paper card of a name written by hand, one card per name", () => {
    expect(paperCard("  Tia   Joana ")).toMatchObject({
      id: "paper:tia-joana",
      name: "Tia Joana",
      imageUrl: null,
    });
    expect(paperCard("Tía joana")?.id).toBe("paper:tia-joana");
    expect(paperCard("   ")).toBeNull();
    expect(paperCard("x".repeat(41))).toBeNull();
  });

  it("lines up dealt cards, extras and paper cards as the presenter's lots", async () => {
    const ctx = { now: 2000, random: rng(2) };
    const state = reduce(
      room(4, { mode: "host", rounds: 1 }),
      { type: "CHAIR", playerId: "p1", seat: "p3" },
      ctx,
    );
    const decks = await lineupDecks(state, rng(4));
    let s = reduce(state, { type: "START", playerId: "p1", decks }, ctx);
    const host = s.lu?.presenter as string;
    const { rooms } = getBackend();
    await rooms.create(s);
    const [extra] = await getBackend().lineup.extras();
    const { state: after } = await queueLots(s.code, host, [
      { kind: "deal", i: 5 },
      { kind: "extra", id: extra.id },
      { kind: "paper", name: "Tia Joana" },
    ]);
    s = after;
    expect(s.lu?.queue.map((c) => c.id)).toEqual([
      decks[0].cards[5].id,
      `x:${extra.id}`,
      "paper:tia-joana",
    ]);
    await expect(
      queueLots(s.code, host, [{ kind: "char", id: "wd-Qnobody" }]),
    ).rejects.toEqual(new GameError("invalid_input"));
  });
});
