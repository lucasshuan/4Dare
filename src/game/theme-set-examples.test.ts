import { describe, expect, it } from "vitest";
import { LOCAL_THEMES } from "@/server/backend/local/fixtures";
import { THEME_SET_EXAMPLES } from "./theme-set-examples";
import { THEME_SET_KEYS } from "./theme-sets";

describe("theme set examples", () => {
  it("are local mode's themes, in their own set", () => {
    for (const set of THEME_SET_KEYS) {
      const examples = THEME_SET_EXAMPLES[set];
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        expect(LOCAL_THEMES).toContainEqual({ ...example, set });
      }
    }
  });
});
