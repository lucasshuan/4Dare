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
  it("draws from the store's list, read once for many matches", async () => {
    const { s, reads } = store(async () => LIST);
    const source = themes(s);
    for (let i = 0; i < 20; i++) {
      const theme = await source.draw([]);
      expect(LIST.map((x) => x.en)).toContain(theme.en);
    }
    expect(reads()).toBe(1);
  });

  it("avoids the themes just played when it can", async () => {
    const { s } = store(async () => LIST);
    const source = themes(s);
    for (let i = 0; i < 20; i++) {
      const theme = await source.draw([LIST[0], LIST[1]]);
      expect(theme.en).toBe("Wizards");
    }
  });

  it("falls back to the bundled list when the store fails", async () => {
    const { s } = store(async () => {
      throw new Error("database down");
    });
    const theme = await themes(s).draw([]);
    expect(themeBank().map((x) => x.en)).toContain(theme.en);
  });

  it("answers instantly from the bundled list before the first read", () => {
    const { s } = store(() => new Promise(() => {}));
    const theme = themes(s).drawFromBank();
    expect(themeBank().map((x) => x.en)).toContain(theme.en);
  });
});
