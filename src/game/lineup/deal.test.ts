import { describe, expect, it } from "vitest";
import { GOSTO_KEYS, type Gosto } from "../gostos";
import { rng } from "../test-utils";
import { type BankExtra, type BankMission, pickMissions, TONES } from "./bank";
import { deckOf, drawLots, type PoolCard, roomPool, STAR_RANK } from "./deal";

const text = (s: string) => ({ en: s, es: s, ja: s, pt: s });

/** A deck of `n` per gosto, ranks interleaved like a real language's. */
const deck = (gostos: readonly Gosto[], n: number): PoolCard[] =>
  Array.from({ length: n * gostos.length }, (_, i) => ({
    id: `wd-Q${i + 1}`,
    gostos: [gostos[i % gostos.length]],
    rank: i + 1,
  }));

const extras: BankExtra[] = Array.from({ length: 10 }, (_, i) => ({
  id: `x${i}`,
  emoji: "👶",
  tint: "#fde2c8",
  name: text(`Extra ${i}`),
}));

describe("what for?: the deck", () => {
  it("keeps the best known, and each gosto's own best known however far down", () => {
    // 30 real people first, then 10 games characters, then 5 more real people
    const known = [
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `r${i}`,
        gostos: ["real" as Gosto],
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `g${i}`,
        gostos: ["games" as Gosto],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `r${30 + i}`,
        gostos: ["real" as Gosto],
      })),
    ];
    const deck = deckOf(known, 20, 4);
    // the first 20, then games' first 4; the rest of the real people are past both
    expect(deck.map((c) => c.id)).toEqual([
      ...Array.from({ length: 20 }, (_, i) => `r${i}`),
      "g0",
      "g1",
      "g2",
      "g3",
    ]);
    expect(deck.map((c) => c.rank)).toEqual(deck.map((_, i) => i + 1));
  });
});

describe("what for?: the lots", () => {
  it("puts an extra every fourth lot and never repeats a card in a match", () => {
    const pool = deck(GOSTO_KEYS, 40);
    const used = new Set<string>();
    const random = rng(3);
    const on = GOSTO_KEYS;
    const rounds = [0, 1].map(() =>
      drawLots(pool, { on, count: 15, extras, used }, random),
    );
    for (const lots of rounds) {
      expect(lots).toHaveLength(15);
      lots.forEach((l, i) => {
        expect(l.kind === "extra", `lot ${i}`).toBe(i % 4 === 3);
      });
    }
    const ids = rounds
      .flat()
      .map((l) => (l.kind === "char" ? l.id : `x:${l.extra.id}`));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never draws the same gosto twice in a row, and opens with a star", () => {
    const pool = deck(GOSTO_KEYS, 40);
    for (let seed = 1; seed < 20; seed++) {
      const lots = drawLots(
        pool,
        { on: GOSTO_KEYS, count: 24, extras: [], used: new Set() },
        rng(seed),
      );
      const chars = lots.flatMap((l) => (l.kind === "char" ? [l] : []));
      for (let i = 1; i < chars.length; i++)
        expect(chars[i].gosto).not.toBe(chars[i - 1].gosto);
      expect(chars[0].star).toBe(true);
      const first = pool.find((c) => c.id === chars[0].id);
      expect(first?.rank).toBeLessThanOrEqual(STAR_RANK);
    }
  });

  it("only deals from the room's gostos", () => {
    const pool = deck(GOSTO_KEYS, 20);
    const on: Gosto[] = ["anime", "games"];
    expect(roomPool(pool, on)).toHaveLength(40);
    const lots = drawLots(
      pool,
      { on, count: 12, extras: [], used: new Set() },
      rng(1),
    );
    for (const l of lots) if (l.kind === "char") expect(on).toContain(l.gosto);
    // one gosto alone still deals, back to back
    const one = drawLots(
      pool,
      { on: ["books"], count: 5, extras: [], used: new Set() },
      rng(2),
    );
    expect(one).toHaveLength(5);
  });
});

describe("what for?: the missions", () => {
  const bank: BankMission[] = TONES.flatMap((tone) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: `${tone}-${i}`,
      tone,
      heavy: i === 0,
      text: text(`${tone} ${i}`),
    })),
  );

  it("draws one per round, none heavy when the room says so, none switched off or recent", () => {
    for (let seed = 1; seed < 30; seed++) {
      const picked = pickMissions(
        bank,
        {
          heavy: false,
          off: ["absurd-1"],
          recent: ["chores-1", "social-2"],
          rounds: 3,
        },
        rng(seed),
      );
      expect(picked).toHaveLength(3);
      expect(new Set(picked.map((m) => m.id)).size).toBe(3);
      for (const m of picked) {
        expect(m.id).not.toMatch(/-0$/);
        expect(["absurd-1", "chores-1", "social-2"]).not.toContain(m.id);
      }
    }
  });

  it("brings the obvious contest about one round in five", () => {
    let contests = 0;
    const random = rng(9);
    for (let i = 0; i < 2000; i++) {
      const [m] = pickMissions(
        bank,
        { heavy: true, off: [], recent: [], rounds: 1 },
        random,
      );
      if (m.id?.startsWith("contest")) contests += 1;
    }
    expect(contests / 2000).toBeGreaterThan(0.16);
    expect(contests / 2000).toBeLessThan(0.24);
  });

  it("still gets its rounds when the room switched nearly everything off", () => {
    const picked = pickMissions(
      bank,
      {
        heavy: true,
        off: bank.slice(1).map((m) => m.id),
        recent: [],
        rounds: 2,
      },
      rng(1),
    );
    expect(picked).toHaveLength(2);
  });
});
