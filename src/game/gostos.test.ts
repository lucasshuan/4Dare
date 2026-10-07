import { describe, expect, it } from "vitest";
import { gostoAllowed, gostosByRule, letsIn, themeAllowed } from "./gostos";

describe("gostos", () => {
  it("guesses a character's gosto from its origin, then its category", () => {
    expect(gostosByRule("al:21", "games")).toEqual(["anime"]);
    expect(gostosByRule("job:singer", null)).toEqual(["real"]);
    expect(gostosByRule("group:beatles", "music")).toEqual(["real"]);
    expect(gostosByRule("wd:Q1", "cartoons")).toEqual(["animation"]);
    expect(gostosByRule("wd:Q1", "mythology")).toEqual(["books"]);
    expect(gostosByRule("wd:Q1", "sports")).toEqual(["real"]);
    expect(gostosByRule(null, null)).toBeNull();
  });

  it("keeps a character while one of its gostos is on, and one with none always", () => {
    expect(gostoAllowed(["anime", "games"], ["anime"])).toBe(true);
    expect(gostoAllowed(["anime"], ["anime"])).toBe(false);
    expect(gostoAllowed(null, ["anime"])).toBe(true);
    expect(gostoAllowed([], ["anime"])).toBe(true);
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
      gostos: [["anime"], ["anime"], ["anime"]] as const,
    };
    const room = { game: "who-am-i", offGostos: [], offThemes: [] } as const;
    expect(letsIn(theme, room)).toBe(true);
    expect(letsIn(theme, { ...room, offThemes: ["robots"] })).toBe(false);
    expect(letsIn(theme, { ...room, offGostos: ["anime"] })).toBe(false);
  });
});
