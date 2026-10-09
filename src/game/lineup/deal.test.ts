import { describe, expect, it } from "vitest";
import { REACH_MAX, TASTE_KEYS, type Taste, tasteReach } from "../tastes";
import { rng } from "../test-utils";
import { type BankExtra, type BankMission, pickMissions, TONES } from "./bank";
import {
  deckOf,
  drawLots,
  POOL_MAX,
  type PoolCard,
  roomDeck,
  STAR_RANK,
  TASTE_POOL,
} from "./deal";

const text = (s: string) => ({ en: s, es: s, ja: s, pt: s });

/** A deck of `n` per taste, ranks interleaved like a real language's. */
const deck = (tastes: readonly Taste[], n: number): PoolCard[] =>
  Array.from({ length: n * tastes.length }, (_, i) => ({
    id: `wd-Q${i + 1}`,
    tastes: [tastes[i % tastes.length]],
    rank: i + 1,
  }));

const extras: BankExtra[] = Array.from({ length: 10 }, (_, i) => ({
  id: `x${i}`,
  emoji: "👶",
  tint: "#fde2c8",
  name: text(`Extra ${i}`),
}));

describe("what for?: the deck", () => {
  it("keeps the best known, and each taste's own best known however far down", () => {
    // 30 real people first, then 10 games characters, then 5 more real people
    const known = [
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `r${i}`,
        tastes: ["real" as Taste],
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `g${i}`,
        tastes: ["games" as Taste],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `r${30 + i}`,
        tastes: ["real" as Taste],
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

describe("what for?: a room's deck", () => {
  /** 3000 real people first, then 400 games characters. */
  const store = [
    ...Array.from({ length: 3000 }, (_, i) => ({
      id: `r${i}`,
      tastes: ["real" as Taste],
    })),
    ...Array.from({ length: 400 }, (_, i) => ({
      id: `g${i}`,
      tastes: ["games" as Taste],
    })),
  ];
  const count = (off: Taste[], g: Taste) =>
    roomDeck(store, off).filter((c) => c.tastes.includes(g)).length;

  it("keeps the best known and each taste's own when every taste is on", () => {
    expect(count([], "real")).toBe(POOL_MAX);
    expect(count([], "games")).toBe(TASTE_POOL);
  });

  it("reaches deeper into the tastes a room keeps, not in proportion", () => {
    const real = TASTE_KEYS.filter((g) => g !== "real");
    const games = TASTE_KEYS.filter((g) => g !== "games");
    // dropping real people: games goes a bit deeper, nowhere near their place
    expect(tasteReach(["real"])).toBeCloseTo(Math.sqrt(8 / 7));
    expect(count(["real"], "games")).toBe(
      Math.round(TASTE_POOL * tasteReach(["real"])),
    );
    // games alone: 2.5 times its usual hundred
    expect(count(games, "games")).toBe(Math.round(TASTE_POOL * REACH_MAX));
    // real people alone: 2.5 times the best known thousand
    expect(count(real, "real")).toBe(Math.round(POOL_MAX * REACH_MAX));
    expect(roomDeck(store, real).every((c) => c.tastes[0] === "real")).toBe(
      true,
    );
  });
});

describe("what for?: the lots", () => {
  it("puts an extra every fourth lot and never repeats a card in a match", () => {
    const pool = deck(TASTE_KEYS, 40);
    const used = new Set<string>();
    const random = rng(3);
    const on = TASTE_KEYS;
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

  it("never draws the same taste twice in a row, and opens with a star", () => {
    const pool = deck(TASTE_KEYS, 40);
    for (let seed = 1; seed < 20; seed++) {
      const lots = drawLots(
        pool,
        { on: TASTE_KEYS, count: 24, extras: [], used: new Set() },
        rng(seed),
      );
      const chars = lots.flatMap((l) => (l.kind === "char" ? [l] : []));
      for (let i = 1; i < chars.length; i++)
        expect(chars[i].taste).not.toBe(chars[i - 1].taste);
      expect(chars[0].star).toBe(true);
      const first = pool.find((c) => c.id === chars[0].id);
      expect(first?.rank).toBeLessThanOrEqual(STAR_RANK);
    }
  });

  it("only deals from the room's tastes", () => {
    const pool = deck(TASTE_KEYS, 20);
    const on: Taste[] = ["anime", "games"];
    const off = TASTE_KEYS.filter((g) => !on.includes(g));
    expect(roomDeck(pool, off)).toHaveLength(40);
    const lots = drawLots(
      pool,
      { on, count: 12, extras: [], used: new Set() },
      rng(1),
    );
    for (const l of lots) if (l.kind === "char") expect(on).toContain(l.taste);
    // one taste alone still deals, back to back
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
