import { describe, expect, it } from "vitest";
import {
  handleCandidates,
  handleProblem,
  normalizeHandle,
  slugHandle,
} from "./handle";

describe("handles", () => {
  it("takes 3 to 20 of a-z, 0-9 and _, and none of the site's words", () => {
    expect(handleProblem("mei")).toBeNull();
    expect(handleProblem("leon_s_kennedy_1998")).toBeNull();
    expect(handleProblem("me")).toBe("short");
    expect(handleProblem("a".repeat(21))).toBe("long");
    expect(handleProblem("Mei")).toBe("chars");
    expect(handleProblem("mei-chan")).toBe("chars");
    expect(handleProblem("admin")).toBe("reserved");
    expect(normalizeHandle("  @Mei_Chan ")).toBe("mei_chan");
  });

  it("makes one from a name: accents off, spaces as _, at most 16", () => {
    expect(slugHandle("João Ninguém")).toBe("joao_ninguem");
    expect(slugHandle("  ★ Leon S. Kennedy ★ ")).toBe("leon_s_kennedy");
    expect(slugHandle("ゆうき")).toBe("");
    expect(slugHandle("a".repeat(30))).toHaveLength(16);
  });

  it("tries the name first, then the name with a piece of the id", () => {
    const id = "dda55a12-3456-7890-abcd-ef0123456789";
    expect(handleCandidates("Mei", id)).toEqual([
      "mei",
      "mei_dda55a",
      "mei_dda55a12",
      "mei_dda55a123456",
    ]);
    // too short, reserved or nothing left: only the ones with the id
    expect(handleCandidates("Jo", id)[0]).toBe("jo__dda55a");
    expect(handleCandidates("Admin", id)[0]).toBe("admin_dda55a");
    expect(handleCandidates("ゆうき", id)[0]).toBe("player");
    for (const h of handleCandidates("x".repeat(40), id))
      expect(handleProblem(h)).toBeNull();
  });
});
