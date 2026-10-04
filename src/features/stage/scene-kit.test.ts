import { describe, expect, it } from "vitest";
import { peopleRow, rouletteSteps } from "./scene-kit";

const ids = (ps: { id: string }[]) => ps.map((p) => p.id).join(" ");
const seats = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i) }));

describe("peopleRow", () => {
  it("puts you at floor((n - 1) / 2), the next players to your right", () => {
    // the prototype: Bia, you, Leo, Rafa
    expect(ids(peopleRow(seats(4), "b").row)).toBe("a b c d");
    expect(ids(peopleRow(seats(4), "a").row)).toBe("d a b c");
    expect(ids(peopleRow(seats(4), "d").row)).toBe("c d a b");
    expect(ids(peopleRow(seats(3), "a").row)).toBe("c a b");
    expect(ids(peopleRow(seats(2), "b").row)).toBe("b a");
  });

  it("gives the chips to the first two players after you", () => {
    expect(ids(peopleRow(seats(4), "c").next)).toBe("d a");
    expect(ids(peopleRow(seats(3), "c").next)).toBe("a b");
    expect(ids(peopleRow(seats(2), "a").next)).toBe("b");
  });
});

describe("rouletteSteps", () => {
  it("starts at once, slows down and lands on the chosen option", () => {
    for (const [tied, chosen] of [
      [[0, 1], 1],
      [[0, 1, 2], 0],
      [[0, 2], 2],
    ] as const) {
      const steps = rouletteSteps(tied, chosen, 2000);
      expect(steps[0].at).toBe(0);
      expect(steps.at(-1)).toEqual({ at: 2000, lit: chosen });
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].at).toBeGreaterThan(steps[i - 1].at);
        expect(steps[i].lit).not.toBe(steps[i - 1].lit);
        expect(tied).toContain(steps[i].lit);
      }
      // each step lasts longer than the one before
      const gaps = steps.slice(1).map((s, i) => s.at - steps[i].at);
      for (let i = 1; i < gaps.length; i++)
        expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    }
  });
});
