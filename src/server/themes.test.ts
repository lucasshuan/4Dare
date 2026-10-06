import { describe, expect, it } from "vitest";
import { THEME_SET_KEYS } from "@/game/theme-sets";
import type { Theme } from "@/game/types";
import { LOCAL_THEMES } from "./backend/local/fixtures";
import type { ThemeStore } from "./backend/types";
import { themes } from "./themes";

const t = (en: string, set: Theme["set"] = "heroes"): Theme => ({
  en,
  es: en,
  pt: en,
  ja: en,
  set,
});
const LIST = [t("Pirates"), t("Robots"), t("Wizards")];

function store(list: () => Promise<Theme[]>) {
  let reads = 0;
  const s: ThemeStore = {
    list: () => {
      reads++;
      return list();
    },
  };
  return { s, reads: () => reads };
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

  it("local mode has three themes in every set", () => {
    for (const set of THEME_SET_KEYS)
      expect(LOCAL_THEMES.filter((x) => x.set === set)).toHaveLength(3);
    expect(LOCAL_THEMES).toHaveLength(THEME_SET_KEYS.length * 3);
  });

  it("reads the list as it starts, so instant draws come from it", async () => {
    const { s, reads } = store(async () => LIST);
    const source = themes(s);
    expect(reads()).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (let i = 0; i < 20; i++)
      expect(
        source
          .drawFromBank(3)
          .map((x) => x.en)
          .sort(),
      ).toEqual(LIST.map((x) => x.en));
    expect(reads()).toBe(1);
  });

  it("has three themes in hand before the first read and when the store fails", async () => {
    const pending = themes(store(() => new Promise(() => {})).s);
    expect(new Set(pending.drawFromBank(3).map((x) => x.en)).size).toBe(3);
    const failing = themes(
      store(async () => {
        throw new Error("database down");
      }).s,
    );
    const drawn = await failing.draw([], 3);
    expect(new Set(drawn.map((x) => x.en)).size).toBe(3);
  });
});
