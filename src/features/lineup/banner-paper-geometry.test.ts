import { describe, expect, it } from "vitest";
import { paperPeel } from "./banner-paper-geometry";

type Point = { x: number; y: number };
function area(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length];
        return sum + a.x * b.y - b.x * a.y;
      }, 0),
    ) / 2
  );
}

describe("diagonal paper peel", () => {
  it.each([
    [100, 150],
    [240, 80],
    [96, 90],
    [218, 110],
  ])(
    "keeps both faces connected and conserves paper area at %i×%i",
    (width, height) => {
      for (const progress of [0.01, 0.13, 0.4, 0.7, 0.95]) {
        const { front, reverse, matrix } = paperPeel(progress, width, height);
        expect(area(front) + area(reverse)).toBeCloseTo(width * height, 7);
        const [a, b, c, d, e, f] = matrix;
        const reflected = reverse.map(({ x, y }) => ({
          x: a * x + c * y + e,
          y: b * x + d * y + f,
        }));
        expect(area(reflected)).toBeCloseTo(area(reverse), 7);
        const crease = front.filter((p) =>
          reverse.some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-7),
        );
        expect(crease.length).toBeGreaterThanOrEqual(2);
        for (const { x, y } of crease) {
          expect(a * x + c * y + e).toBeCloseTo(x, 7);
          expect(b * x + d * y + f).toBeCloseTo(y, 7);
        }
      }
    },
  );

  it("starts fully attached and reaches a fully peeled sheet", () => {
    const attached = paperPeel(0, 100, 150);
    const peeled = paperPeel(1, 100, 150);
    expect(area(attached.front)).toBe(15000);
    expect(area(attached.reverse)).toBe(0);
    expect(area(peeled.front)).toBeCloseTo(0, 7);
    expect(area(peeled.reverse)).toBe(15000);
  });
});
