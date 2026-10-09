import { describe, expect, it } from "vitest";
import { letsIn, tasteAllowed, tastesByRule, themeAllowed } from "./tastes";

describe("tastes", () => {
  it("guesses a character's taste from its origin, then its category", () => {
    expect(tastesByRule("al:21", "games")).toEqual(["anime"]);
    expect(tastesByRule("job:singer", null)).toEqual(["real"]);
    expect(tastesByRule("group:beatles", "music")).toEqual(["real"]);
    expect(tastesByRule("wd:Q1", "cartoons")).toEqual(["animation"]);
    expect(tastesByRule("wd:Q1", "mythology")).toEqual(["books"]);
    expect(tastesByRule("wd:Q1", "sports")).toEqual(["real"]);
    expect(tastesByRule(null, null)).toBeNull();
  });

  it("keeps a character while one of its tastes is on, and one with none always", () => {
    expect(tasteAllowed(["anime", "games"], ["anime"])).toBe(true);
    expect(tasteAllowed(["anime"], ["anime"])).toBe(false);
    expect(tasteAllowed(null, ["anime"])).toBe(true);
    expect(tasteAllowed([], ["anime"])).toBe(true);
  });

  it("keeps a theme while 3 of its starters stay, or all when it has fewer", () => {
    const four = [["anime"], ["anime"], ["live"], null] as const;
    expect(themeAllowed(four, ["anime"])).toBe(false);
    expect(themeAllowed(four, ["live"])).toBe(true);
    expect(themeAllowed([["live"], ["live"]], ["anime"])).toBe(true);
    expect(themeAllowed([["live"], ["anime"]], ["anime"])).toBe(false);
    expect(themeAllowed([], ["anime"])).toBe(true);
  });

  it("lets a theme into a room of its game, unless switched off", () => {
    const theme = {
      id: "robots",
      games: ["who-am-i"] as const,
      tastes: [["anime"], ["anime"], ["anime"]] as const,
    };
    const room = { game: "who-am-i", offTastes: [], offThemes: [] } as const;
    expect(letsIn(theme, room)).toBe(true);
    expect(letsIn(theme, { ...room, offThemes: ["robots"] })).toBe(false);
    expect(letsIn(theme, { ...room, offTastes: ["anime"] })).toBe(false);
  });
});
