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

const { lineupDecks } = await import("./lineup");

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

  it("refuses to deal from gostos with too few characters", async () => {
    const state = room(2, {
      offGostos: [
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
