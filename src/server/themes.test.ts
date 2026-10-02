import { describe, expect, it } from "vitest";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import type { Theme } from "@/game/types";
import type { ThemeStore } from "./backend/types";
import { themeBank, themes } from "./themes";

const t = (en: string, set: Theme["set"] = "heroes"): Theme => ({
  en,
  pt: en,
  ja: en,
  set,
});
const LIST = [t("Pirates"), t("Robots"), t("Wizards")];

function store(list: () => Promise<Theme[]>) {
  let reads = 0;
  const added: Theme[] = [];
  const s: ThemeStore = {
    list: () => {
      reads++;
      return list();
    },
    add: async (theme) => {
      added.push(theme);
    },
  };
  return { s, added, reads: () => reads };
}

describe("themes", () => {
  it("draws different themes from the store's list, read once for many matches", async () => {
    const { s, reads } = store(async () => LIST);
    const source = themes(s);
    for (let i = 0; i < 20; i++) {
      const drawn = await source.draw([], 3);
      expect(drawn.map((x) => x.en).sort()).toEqual(LIST.map((x) => x.en));
    }
    expect(reads()).toBe(1);
  });

  it("avoids the themes just played when it can", async () => {
    const { s } = store(async () => LIST);
    const source = themes(s);
    for (let i = 0; i < 20; i++) {
      const [first] = await source.draw([LIST[0], LIST[1]], 1);
      expect(first.en).toBe("Wizards");
    }
  });

  it("draws from the chosen sets, and from the others only when they run short", async () => {
    const list = [
      t("Pirates", "warriors"),
      t("Ninjas", "warriors"),
      t("Knights", "warriors"),
      t("Robots", "scifi"),
      t("Mario", "games"),
    ];
    const { s } = store(async () => list);
    const source = themes(s);
    for (let i = 0; i < 20; i++) {
      const drawn = await source.draw([], 3, ["warriors"]);
      expect(drawn.map((x) => x.set)).toEqual([
        "warriors",
        "warriors",
        "warriors",
      ]);
      const short = await source.draw([], 3, ["scifi", "games"]);
      expect(
        short
          .slice(0, 2)
          .map((x) => x.en)
          .sort(),
      ).toEqual(["Mario", "Robots"]);
      expect(short[2].set).toBe("warriors");
    }
  });

  it("every bundled theme belongs to a known set, and every set has themes", () => {
    const sets = new Set(themeBank().map((x) => x.set));
    expect([...sets].sort()).toEqual([...THEME_SET_KEYS].sort());
  });

  it("falls back to the bundled list when the store fails", async () => {
    const { s } = store(async () => {
      throw new Error("database down");
    });
    const drawn = await themes(s).draw([], 3);
    expect(drawn).toHaveLength(3);
    for (const theme of drawn)
      expect(themeBank().map((x) => x.en)).toContain(theme.en);
  });

  it("answers instantly from the bundled list before the first read", () => {
    const { s } = store(() => new Promise(() => {}));
    const drawn = themes(s).drawFromBank(3);
    expect(new Set(drawn.map((x) => x.en)).size).toBe(3);
    for (const theme of drawn)
      expect(themeBank().map((x) => x.en)).toContain(theme.en);
  });
});
