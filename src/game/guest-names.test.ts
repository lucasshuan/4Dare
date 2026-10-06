import { describe, expect, it } from "vitest";
import {
  ADJECTIVES,
  GUEST_NAME_COUNT,
  GUEST_NAME_MAX,
  guestName,
  LEGENDARY,
  NOUNS,
  randomGuestNumber,
  TITLES,
} from "./guest-names";
import { LANGS } from "./types";

const numberOf = (en: string) => {
  for (let n = 0; n < GUEST_NAME_COUNT; n++)
    if (guestName(n, "en") === en) return n;
  throw new Error(`no ${en}`);
};

const fits = (n: number) =>
  LANGS.every((l) => [...guestName(n, l)].length <= GUEST_NAME_MAX[l]);

describe("guest names", () => {
  it("has a hundred thousand combinations", () => {
    expect(GUEST_NAME_COUNT).toBeGreaterThan(100_000);
  });

  it("orders words per language and agrees in gender in Portuguese and Spanish", () => {
    const cat = numberOf("WonderfulCat");
    expect(guestName(cat, "pt")).toBe("GatoMaravilhoso");
    expect(guestName(cat, "es")).toBe("GatoMaravilloso");
    expect(guestName(cat, "ja")).toBe("すてきなネコ");
    const fox = numberOf("WonderfulFox");
    expect(guestName(fox, "pt")).toBe("RaposaMaravilhosa");
    expect(guestName(fox, "es")).toBe("ZorroMaravilloso");
    const frog = numberOf("WonderfulFrog");
    expect(guestName(frog, "pt")).toBe("SapoMaravilhoso");
    expect(guestName(frog, "es")).toBe("RanaMaravillosa");
  });

  it("makes hybrids of two nouns", () => {
    const n = numberOf("PotatoNinja");
    expect(guestName(n, "pt")).toBe("BatataNinja");
    expect(guestName(n, "es")).toBe("PapaNinja");
    expect(guestName(n, "ja")).toBe("ジャガイモ忍者");
  });

  it("gives titles the noun's gender, after the noun in Japanese", () => {
    const fox = numberOf("QueenFox");
    expect(guestName(fox, "pt")).toBe("RainhaRaposa");
    expect(guestName(fox, "es")).toBe("ReinaZorro");
    expect(guestName(fox, "ja")).toBe("キツネ女王");
    const cat = numberOf("KingCat");
    expect(guestName(cat, "pt")).toBe("ReiGato");
    expect(guestName(cat, "es")).toBe("ReyGato");
    expect(guestName(cat, "ja")).toBe("ネコ大王");
  });

  it("gives gendered titles the other gender too", () => {
    const cat = numberOf("QueenCat");
    expect(guestName(cat, "pt")).toBe("RainhaGato");
    expect(guestName(cat, "es")).toBe("ReinaGato");
    expect(guestName(cat, "ja")).toBe("ネコ女王");
    const fox = numberOf("KingFox");
    expect(guestName(fox, "pt")).toBe("ReiRaposa");
    expect(guestName(fox, "es")).toBe("ReyZorro");
    expect(guestName(fox, "ja")).toBe("キツネ大王");
    expect(numberOf("QueenCat")).toBeGreaterThan(numberOf("QueenBrave"));
  });

  it("translates legendary names to their local twin", () => {
    const n = numberOf("TGIF");
    expect(guestName(n, "pt")).toBe("Sextou");
    expect(guestName(n, "es")).toBe("YaEsViernes");
    expect(guestName(n, "ja")).toBe("花金");
  });

  it("pairs titles with adjectives, half of them feminine", () => {
    const king = numberOf("KingSleepy");
    expect(guestName(king, "pt")).toBe("ReiSonolento");
    expect(guestName(king, "es")).toBe("ReyDormilón");
    expect(guestName(king, "ja")).toBe("眠たい大王");
    const queen = numberOf("QueenBrave");
    expect(guestName(queen, "pt")).toBe("RainhaCorajosa");
    expect(guestName(queen, "es")).toBe("ReinaValiente");
    expect(guestName(queen, "ja")).toBe("勇敢な女王");
  });

  it("keeps older numbers' names: titles with adjectives come after the legendary ones", () => {
    expect(numberOf(LEGENDARY[0][0])).toBe(
      ADJECTIVES.length * NOUNS.length +
        NOUNS.length * NOUNS.length +
        TITLES.length * NOUNS.length,
    );
    expect(numberOf("CaptainBrave")).toBe(
      numberOf(LEGENDARY[0][0]) + LEGENDARY.length,
    );
  });

  it("gives every number its own name in every language", () => {
    for (const lang of LANGS) {
      const names = new Set<string>();
      for (let n = 0; n < GUEST_NAME_COUNT; n++) names.add(guestName(n, lang));
      expect(names.size).toBe(GUEST_NAME_COUNT);
    }
  });

  it("has no duplicate or malformed words", () => {
    for (const column of [0, 1, 2, 3, 4, 5] as const) {
      const adjectives = ADJECTIVES.map((a) => a[column]);
      expect(new Set(adjectives).size).toBe(adjectives.length);
      // columns 2 and 5 of a noun are genders
      const nouns = NOUNS.map((n) => n[column]);
      if (column !== 2 && column !== 5)
        expect(new Set(nouns).size).toBe(nouns.length);
    }
    for (const word of [
      ...ADJECTIVES.flat(),
      ...NOUNS.flatMap(([en, pt, , ja, es]) => [en, pt, ja, es]),
      ...TITLES.flat(),
      ...LEGENDARY.flat(),
    ])
      expect(word).toMatch(/^\S+$/);
    for (const ja of [
      ...[...ADJECTIVES, ...NOUNS].map((row) => row[3]),
      ...TITLES.flatMap((t) => [t[4], t[5]]),
    ])
      expect(ja).not.toMatch(/[A-Za-z]/);
    for (const word of [
      ...[...ADJECTIVES, ...NOUNS, ...LEGENDARY].flatMap((r) => r.slice(0, 2)),
      ...ADJECTIVES.flatMap((a) => [a[4], a[5]]),
      ...NOUNS.map((n) => n[4]),
      ...LEGENDARY.map((l) => l[3]),
      ...TITLES.flatMap((t) => [...t.slice(0, 4), t[6], t[7]]),
    ])
      expect(word).toMatch(/^\p{Lu}/u);
  });

  it("keeps every legendary name short enough", () => {
    const start = numberOf(LEGENDARY[0][0]);
    for (let i = 0; i < LEGENDARY.length; i++)
      expect(fits(start + i)).toBe(true);
  });

  it("draws names short enough in every language", () => {
    for (let i = 0; i < 2000; i++) expect(fits(randomGuestNumber())).toBe(true);
  });

  it("now and then draws a legendary name", () => {
    const isLegendary = (n: number) =>
      LEGENDARY.some(([en]) => en === guestName(n, "en"));
    expect(isLegendary(randomGuestNumber(() => 0))).toBe(true);
    expect(isLegendary(randomGuestNumber(() => 0.5))).toBe(false);
  });

  it("never breaks on odd numbers", () => {
    for (const n of [-5, 10.7, Number.NaN, GUEST_NAME_COUNT * 3 + 1])
      expect(guestName(n, "en")).toMatch(/^[A-Z]/);
  });
});
