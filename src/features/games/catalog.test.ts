import { describe, expect, it } from "vitest";
import type { GameKey } from "@/game/games";
import {
  fromSearch,
  type GameFilters,
  NO_FILTERS,
  PLAYER_COUNTS,
  pickGames,
  toSearch,
} from "./catalog";

const NAMES: Record<GameKey, string> = {
  "who-am-i": "Quem sou eu?",
  impostor: "Impostor",
  lineup: "Escalação",
};

const pick = (
  patch: Partial<GameFilters>,
  online: Partial<Record<GameKey, number>> | null = null,
) =>
  pickGames(
    { ...NO_FILTERS, ...patch },
    {
      text: (g) => NAMES[g],
      name: (g) => NAMES[g],
      online,
      locale: "pt",
    },
  );

describe("pickGames", () => {
  it("keeps every game in the featured order with no filter", () => {
    expect(pick({})).toEqual(["who-am-i", "impostor", "lineup"]);
  });

  it("searches without case or accents", () => {
    expect(pick({ q: "ESCALACAO" })).toEqual(["lineup"]);
  });

  it("keeps the games a table this big can play", () => {
    expect(pick({ players: 2 })).toEqual(["who-am-i", "lineup"]);
    expect(pick({ players: 10 })).toEqual(["impostor"]);
  });

  it("sorts by players online, ties in the featured order", () => {
    expect(pick({ sort: "popular" }, { lineup: 3 })).toEqual([
      "lineup",
      "who-am-i",
      "impostor",
    ]);
  });

  it("sorts by name", () => {
    expect(pick({ sort: "name" })).toEqual(["lineup", "impostor", "who-am-i"]);
  });
});

describe("the link", () => {
  it("carries only what differs from the defaults", () => {
    expect(toSearch(NO_FILTERS)).toBe("");
    const f: GameFilters = {
      q: "vote",
      players: 4,
      sort: "name",
    };
    expect(fromSearch(toSearch(f))).toEqual(f);
  });

  it("drops what it does not know", () => {
    expect(fromSearch("?players=99&sort=new")).toEqual(NO_FILTERS);
  });

  it("spans every open game's table sizes", () => {
    expect(PLAYER_COUNTS[0]).toBe(2);
    expect(PLAYER_COUNTS.at(-1)).toBe(10);
  });
});
