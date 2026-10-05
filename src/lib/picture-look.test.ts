import { describe, expect, it } from "vitest";
import { lookOf, oklchOf } from "./picture-look";

const SIDE = 8;

/** An 8×8 RGBA picture from a pixel function. */
function picture(
  at: (x: number, y: number) => [number, number, number, number],
) {
  const data = new Uint8ClampedArray(SIDE * SIDE * 4);
  for (let y = 0; y < SIDE; y++)
    for (let x = 0; x < SIDE; x++) data.set(at(x, y), (y * SIDE + x) * 4);
  return data;
}

describe("lookOf", () => {
  it("takes the hue with the most colour, not the most pixels", () => {
    // mostly white, with a green middle: green wins
    const look = lookOf(
      picture((x, y) =>
        x > 1 && x < 6 && y > 1 && y < 6
          ? [115, 188, 128, 255]
          : [255, 255, 255, 255],
      ),
      SIDE,
    );
    expect(look.cutout).toBe(false);
    expect(look.c).toBeGreaterThan(0.08);
    expect(look.h).toBeCloseTo(oklchOf(115, 188, 128).h, 0);
  });

  it("calls a picture with no colour grey", () => {
    const look = lookOf(
      picture((x) => {
        const v = x * 30;
        return [v, v, v, 255];
      }),
      SIDE,
    );
    expect(look.c).toBe(0);
  });

  it("sees a cut-out by its see-through edges", () => {
    const look = lookOf(
      picture((x, y) =>
        x > 1 && x < 6 && y > 1 && y < 6 ? [255, 143, 171, 255] : [0, 0, 0, 0],
      ),
      SIDE,
    );
    expect(look.cutout).toBe(true);
    expect(look.c).toBeGreaterThan(0.05);
  });
});
