import { describe, expect, it } from "vitest";
import {
  cleanQuote,
  DEFAULT_PRIVACY,
  parseAbout,
  parseAccent,
  parseBanner,
  parsePrivacy,
  parseShowcase,
  sees,
} from "./profile";

describe("a profile's choices", () => {
  it("reads a cover, an accent and a quote, and nothing it does not know", () => {
    expect(
      parseBanner({ kind: "pattern", pattern: "dots", tint: "avatar" }),
    ).toEqual({ kind: "pattern", pattern: "dots", tint: "avatar" });
    // the first covers turn into a pattern
    expect(parseBanner({ kind: "preset", id: "sea" })).toEqual({
      kind: "pattern",
      pattern: "waves",
      tint: "sky",
    });
    expect(
      parseBanner({ kind: "pattern", pattern: "lava", tint: "sky" }),
    ).toBeNull();
    expect(parseBanner({ kind: "image", url: "https://x/y.webp" })).toEqual({
      kind: "image",
      url: "https://x/y.webp",
    });
    expect(parseBanner({ kind: "preset", id: "lava" })).toBeNull();
    expect(parseBanner("sea")).toBeNull();
    expect(parseAccent("rose")).toBe("rose");
    // the first accents were hex colours
    expect(parseAccent("#0B7A75")).toBe("teal");
    expect(parseAccent("#123456")).toBeNull();
    expect(cleanQuote("  Se for o   Shrek,\n eu descubro  ")).toBe(
      "Se for o Shrek, eu descubro",
    );
    expect(cleanQuote("   ")).toBeNull();
    expect(cleanQuote("x".repeat(100))).toHaveLength(80);
  });

  it("keeps three different characters on the showcase, captions cut to 60", () => {
    expect(
      parseShowcase([
        { characterId: "wd-Q1", caption: "Amor da minha vida <3" },
        { characterId: "wd-Q1", caption: "again" },
        { characterId: "u-2", caption: "y".repeat(80) },
        { characterId: "", caption: "none" },
        { characterId: "wd-Q3" },
        { characterId: "wd-Q4", caption: "a fourth" },
      ]),
    ).toEqual([
      { characterId: "wd-Q1", caption: "Amor da minha vida <3" },
      { characterId: "u-2", caption: "y".repeat(60) },
      { characterId: "wd-Q3", caption: "" },
    ]);
    expect(parseShowcase({})).toEqual([]);
  });

  it("starts with about empty and everything open", () => {
    expect(parseAbout(null)).toEqual({ time: null, langs: [] });
    expect(parseAbout({ time: "night", langs: ["ja", "xx", "pt"] })).toEqual({
      time: "night",
      langs: ["ja", "pt"],
    });
    expect(parsePrivacy(undefined)).toEqual(DEFAULT_PRIVACY);
    expect(
      parsePrivacy({ activity: "me", mural: "nobody", playing: false }),
    ).toEqual({ ...DEFAULT_PRIVACY, activity: "me", playing: false });
  });

  it("shows each part to its audience; friends wait for friends", () => {
    const stranger = { isOwner: false, playedWith: false };
    const mate = { isOwner: false, playedWith: true };
    const owner = { isOwner: true, playedWith: false };
    expect(sees("all", stranger)).toBe(true);
    expect(sees("played", stranger)).toBe(false);
    expect(sees("played", mate)).toBe(true);
    expect(sees("friends", mate)).toBe(false);
    expect(sees("me", mate)).toBe(false);
    expect(sees("me", owner)).toBe(true);
  });
});
