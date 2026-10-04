import { describe, expect, it } from "vitest";
import { drawTimes, hopFrames } from "./draw-urn";
import { RING_GAP, ringGeometry, ringTimes } from "./who-ring";

const SQUASH = 0.16;

describe("draw schedule", () => {
  it("hops at 1.40 + 0.22·i, in turn order", () => {
    for (const n of [2, 3, 4])
      expect(drawTimes(n, true).hops).toEqual(
        Array.from(
          { length: n },
          (_, i) => Math.round((1.4 + 0.22 * i) * 1000) / 1000,
        ),
      );
  });

  it("never lets a swallow squash overlap the anticipation, the shake or the swell", () => {
    for (const n of [2, 3, 4]) {
      const tm = drawTimes(n, true);
      const lastSquashEnd = (tm.squashes.at(-1) ?? 0) + SQUASH;
      expect(tm.anticipation).toBe(
        Math.max(2.45, Math.round(lastSquashEnd * 1000) / 1000),
      );
      expect(tm.shake).toBeCloseTo(tm.anticipation + tm.anticipationDur, 6);
      expect(tm.shake + tm.shakeDur).toBeLessThanOrEqual(tm.swell + 1e-9);
      expect(tm.swell + tm.swellDur).toBeCloseTo(tm.slip, 6);
    }
  });

  it("keeps the prototype's times with two players", () => {
    const tm = drawTimes(2, true);
    expect([
      tm.anticipation,
      tm.shake,
      tm.shakeDur,
      tm.marks,
      tm.slosh,
    ]).toEqual([2.45, 2.67, 1.15, 2.7, 2.75]);
    expect([tm.swell, tm.slip, tm.slipDur, tm.front, tm.urnOut]).toEqual([
      3.85, 4.13, 0.6, 4.3, 4.3,
    ]);
  });

  it("fits the later variant in its 3 s: hops together, one 0.6 s shake", () => {
    const tm = drawTimes(4, false);
    expect(new Set(tm.hops).size).toBe(1);
    expect(tm.squashes).toHaveLength(1);
    expect(tm.shakeDur).toBe(0.6);
    expect(tm.row + tm.rowStagger * 3 + tm.rowDur).toBeLessThanOrEqual(
      tm.hops[0],
    );
    expect(tm.squashes[0] + SQUASH).toBeLessThanOrEqual(tm.anticipation + 1e-9);
    expect(tm.slip + tm.slipDur).toBeLessThanOrEqual(3);
    expect(tm.urnOut + 0.45).toBeLessThanOrEqual(3);
  });

  it("hops in a straight tent, 90 px above the landing at half way", () => {
    const { x, y } = hopFrames(100, 40);
    expect([x[0], y[0]]).toEqual([0, 0]);
    expect([x.at(-1), y.at(-1)]).toEqual([100, 40]);
    expect(x[8]).toBe(50);
    expect(y[8]).toBe(-50);
    expect(Math.min(...y)).toBe(-50);
  });
});

describe("ring of who picks for whom", () => {
  it("has the spec's sizes", () => {
    expect(ringGeometry(4, false)).toMatchObject({ R: 74, A: 40, size: 212 });
    expect(ringGeometry(4, true)).toMatchObject({ R: 62, A: 34, size: 182 });
  });

  it("starts at the top and goes clockwise", () => {
    const g = ringGeometry(4, false);
    expect(g.seats).toEqual([
      { x: 106, y: 32 },
      { x: 180, y: 106 },
      { x: 106, y: 180 },
      { x: 32, y: 106 },
    ]);
  });

  it("spans 360°/n − 50.4° per arc, a gap of 0.44 rad kept at each face", () => {
    for (const [n, deg] of [
      [2, 129.6],
      [3, 69.6],
      [4, 39.6],
    ] as const) {
      const g = ringGeometry(n, false);
      expect(g.arcs).toHaveLength(n);
      for (const a of g.arcs) {
        expect((a.length / g.R) * (180 / Math.PI)).toBeCloseTo(deg, 1);
        expect(a.d).toMatch(/A74 74 0 0 1 /);
      }
      expect(RING_GAP).toBe(0.44);
    }
    expect(ringGeometry(4, false).arcs[0].length).toBeCloseTo(51.1, 1);
  });

  it("points each head along the circle, clockwise", () => {
    const g = ringGeometry(4, false);
    // the first arc (top → right) ends 0.44 rad before 0 rad
    expect(g.arcs[0].head.deg).toBeCloseTo((-RING_GAP * 180) / Math.PI + 90, 1);
  });

  it("lights yours at T + 0.22 + 0.13·n + 0.15 (2.19 with four players)", () => {
    expect(ringTimes(4, true).lit).toBeCloseTo(2.19, 6);
    expect(ringTimes(2, true).lit).toBeCloseTo(1.93, 6);
    expect(ringTimes(4, false)).toMatchObject({ box: 0, lit: 0.5 });
  });
});
