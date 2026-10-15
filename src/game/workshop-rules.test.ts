import { describe, expect, it } from "vitest";
import { priority, voteWeight, wilsonLower } from "./workshop-rules";

const v = (yes: boolean, level = 1, live = 0, staff = false) => ({
  yes,
  level,
  live,
  staff,
});

describe("the Workshop's queue", () => {
  it("weighs a vote by level, live suggestions (up to 5) and staff", () => {
    expect(voteWeight({ level: 0, live: 0, staff: false })).toBe(1);
    expect(voteWeight({ level: 10, live: 9, staff: true })).toBeCloseTo(
      1 + 1 + 0.5 + 0.5,
    );
  });

  it("takes the Wilson lower bound, below the plain share", () => {
    expect(wilsonLower(1, 3, 1.28)).toBeLessThan(1);
    expect(wilsonLower(0.5, 0, 1.28)).toBe(0);
  });

  it("puts many yeses over a lucky few, and adds the author's points", () => {
    const few = priority([v(true), v(true)], 0);
    const many = priority(
      Array.from({ length: 12 }, (_, i) => v(i < 11)),
      0,
    );
    expect(many).toBeGreaterThan(few);
    expect(priority([], 3)).toBe(6);
    expect(priority([v(false), v(false)], 0)).toBe(0);
  });
});
