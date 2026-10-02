import { describe, expect, it } from "vitest";
import type { Localized } from "@/game/types";
import type { ThemeStore } from "./backend/types";
import { themeBank, themes } from "./themes";

const t = (en: string): Localized => ({ en, pt: en, ja: en });
const LIST = [t("Pirates"), t("Robots"), t("Wizards")];

function store(list: () => Promise<Localized[]>) {
  let reads = 0;
  const added: Localized[] = [];
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
