import { describe, expect, it } from "vitest";
import {
  ADJECTIVES,
  GUEST_NAME_COUNT,
  GUEST_NAME_MAX,
  guestName,
  NOUNS,
  randomGuestNumber,
} from "./guest-names";
import { LANGS } from "./types";

const numberOf = (en: string) => {
  for (let n = 0; n < GUEST_NAME_COUNT; n++)
    if (guestName(n, "en") === en) return n;
  throw new Error(`no ${en}`);
};

describe("guest names", () => {
  it("has thousands of combinations", () => {
    expect(GUEST_NAME_COUNT).toBeGreaterThan(20_000);
  });

  it("orders words per language and agrees in gender in Portuguese", () => {
    const cat = numberOf("WonderfulCat");
    expect(guestName(cat, "pt")).toBe("GatoMaravilhoso");
    expect(guestName(cat, "ja")).toBe("すてきなネコ");
    const fox = numberOf("WonderfulFox");
    expect(guestName(fox, "pt")).toBe("RaposaMaravilhosa");
  });

  it("has no duplicate or malformed words", () => {
    for (const column of [0, 1, 2, 3] as const) {
      const adjectives = ADJECTIVES.map((a) => a[column]);
      if (column !== 2)
        expect(new Set(adjectives).size).toBe(adjectives.length);
      const nouns = NOUNS.map((n) => n[column]);
      if (column !== 2) expect(new Set(nouns).size).toBe(nouns.length);
    }
    for (const word of [
      ...ADJECTIVES.flat(),
      ...NOUNS.flatMap(([en, pt, , ja]) => [en, pt, ja]),
    ])
      expect(word).toMatch(/^\S+$/);
    for (const [, , , ja] of [...ADJECTIVES, ...NOUNS])
      expect(ja).not.toMatch(/[A-Za-z]/);
    for (const [en, pt] of [...ADJECTIVES, ...NOUNS]) {
      expect(en).toMatch(/^\p{Lu}/u);
      expect(pt).toMatch(/^\p{Lu}/u);
    }
  });

  it("draws names short enough in every language", () => {
    for (let i = 0; i < 2000; i++) {
      const n = randomGuestNumber();
      for (const lang of LANGS)
        expect([...guestName(n, lang)].length).toBeLessThanOrEqual(
          GUEST_NAME_MAX[lang],
        );
    }
  });

  it("never breaks on odd numbers", () => {
    for (const n of [-5, 10.7, Number.NaN, GUEST_NAME_COUNT * 3 + 1])
      expect(guestName(n, "en")).toMatch(/^[A-Z]/);
  });
});
