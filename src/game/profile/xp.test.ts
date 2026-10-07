import { describe, expect, it } from "vitest";
import { levelCost, levelOf } from "./xp";

describe("levels", () => {
  it("starts at 1 and costs 50 more each level", () => {
    expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 100 });
    expect(levelOf(99)).toEqual({ level: 1, into: 99, need: 100 });
    expect(levelOf(100)).toEqual({ level: 2, into: 0, need: 150 });
    expect(levelOf(260)).toEqual({ level: 3, into: 10, need: 200 });
    expect(levelOf(-5).level).toBe(1);
  });

  it("reaches level 10 after about a hundred matches", () => {
    let total = 0;
    for (let l = 1; l < 10; l++) total += levelCost(l);
    expect(levelOf(total).level).toBe(10);
    expect(total / 30).toBeGreaterThan(80);
    expect(total / 30).toBeLessThan(120);
  });
});
