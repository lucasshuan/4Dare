import { describe, expect, it } from "vitest";
import bank from "../../data/themes.json";
import { THEME_SET_EXAMPLES } from "./theme-set-examples";
import { THEME_SET_KEYS } from "./theme-sets";
import type { Theme } from "./types";

describe("theme set examples", () => {
  it("are real themes of their own set", () => {
    const themes = bank as Theme[];
    for (const set of THEME_SET_KEYS) {
      const examples = THEME_SET_EXAMPLES[set];
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        expect(themes).toContainEqual({ ...example, set });
      }
    }
  });
});
