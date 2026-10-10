import { describe, expect, it } from "vitest";
import { THEME_SETS } from "@/game/theme-sets";
import { setsForTastes } from "./theme-filters";

describe("suggestion taste filters", () => {
  const catalog = [
    { set: "anime", tastes: [["anime"]] },
    { set: "sports", tastes: [["real"]] },
    { set: "looks", tastes: [["anime"], ["real"]] },
    { set: "books", tastes: [null] },
  ] satisfies Parameters<typeof setsForTastes>[1];

  it("keeps every set without a filter or without catalog evidence", () => {
    expect(setsForTastes([], undefined)).toEqual(THEME_SETS);
    expect(setsForTastes(["anime"], undefined)).toEqual(THEME_SETS);
  });

  it("hides incompatible sets while preserving mixed and unknown sets", () => {
    const keys = setsForTastes(["anime"], catalog).map((set) => set.key);
    expect(keys).not.toContain("sports");
    expect(keys).toEqual(
      expect.arrayContaining(["anime", "looks", "books", "jobs"]),
    );
  });

  it("accepts any selected taste", () => {
    expect(setsForTastes(["anime", "real"], catalog)).toEqual(THEME_SETS);
  });

  it("keeps sets available when the catalog has no examples of the selected taste", () => {
    const known = THEME_SETS.map((set) => ({
      set: set.key,
      tastes: [["real" as const]],
    }));
    expect(setsForTastes(["faith"], known)).toEqual(THEME_SETS);
  });
});
