import { describe, expect, it } from "vitest";
import { entryId, parseEntryId } from "./seed-format";

describe("library ids", () => {
  it("come back from the app's id in every language", () => {
    for (const id of ["wd-Q302", "al-40", "hand-fox-mccloud", "hand-r2-d2"])
      expect(parseEntryId(entryId("pt", id))).toEqual({ lang: "pt", id });
  });

  it("leave players' characters and stray ids alone", () => {
    expect(parseEntryId("u-0b9c7c1e-3f4a-4f8e-9d2c-1a2b3c4d5e6f")).toBeNull();
    expect(parseEntryId("pt-hand-")).toBeNull();
    expect(parseEntryId("pt-hand-Fox")).toBeNull();
    expect(parseEntryId("de-wd-Q302")).toBeNull();
  });
});
