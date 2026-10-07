import { describe, expect, it } from "vitest";
import { char, rng } from "../test-utils";
import { givesAway, validAnswer } from "./answers";
import { type BankQuestion, parseOptions, pickQuestions } from "./questions";
import { stoodOut } from "./record";
import type { ImpAsked, ImpostorMatch } from "./types";

const L = (t: string) => ({ en: t, es: t, ja: t, pt: t });
const q = (
  id: string,
  kind: BankQuestion["kind"],
  spice: 1 | 2 | 3,
  more: Partial<BankQuestion> = {},
): BankQuestion => ({
  id,
  kind,
  scope: "general",
  set: null,
  themeId: null,
  audience: "all",
  spice,
  text: L(id),
  options: null,
  ...more,
});

const BANK: BankQuestion[] = [
  q("a1", "scale", 1),
  q("a2", "color", 1),
  q("a3", "pick", 2),
  q("a4", "word", 3),
  q("a5", "emoji", 2),
  q("a6", "scale", 3),
  q("a7", "word", 1),
  q("f1", "scale", 1, { audience: "fiction" }),
  q("r1", "pick", 1, { audience: "real" }),
  q("s1", "pick", 2, { scope: "set", set: "anime" }),
  q("s2", "scale", 2, { scope: "set", set: "warriors" }),
  q("t1", "word", 2, { scope: "theme", themeId: "poke-mon" }),
];

describe("impostor questions", () => {
  it("picks the ones that fit, light first, nothing spicy before the vote, no kind twice in a row", () => {
    for (let seed = 1; seed < 40; seed++) {
      const picked = pickQuestions(BANK, {
        set: "anime",
        themeId: null,
        audience: "fiction",
        recent: [],
        random: rng(seed),
        count: 6,
      });
      const ids = picked.map((x) => x.id);
      expect(ids).not.toContain("r1");
      expect(ids).not.toContain("s2");
      expect(ids).not.toContain("t1");
      expect(picked[0].spice).toBe(1);
      expect(picked[1].spice).toBeLessThan(3);
      for (let i = 1; i < picked.length; i++)
        expect(picked[i].kind).not.toBe(picked[i - 1].kind);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("leaves the room's recent questions out while others are left", () => {
    const picked = pickQuestions(BANK, {
      set: null,
      themeId: null,
      audience: "all",
      recent: ["a1", "a2"],
      random: rng(3),
      count: 4,
    });
    expect(picked.map((x) => x.id)).not.toContain("a1");
    expect(picked.map((x) => x.id)).not.toContain("a2");
  });

  it("reads options only when they fit the kind", () => {
    const end = { emoji: "😱", en: "a", es: "a", ja: "a", pt: "a" };
    expect(parseOptions("scale", { low: end, high: end })).toMatchObject({
      low: { emoji: "😱", text: L("a") },
    });
    expect(parseOptions("scale", { low: end })).toBeUndefined();
    expect(parseOptions("pick", { choices: [end] })).toBeUndefined();
    expect(parseOptions("emoji", { palette: "foods" })).toEqual({
      palette: "foods",
    });
    expect(parseOptions("emoji", { palette: "nope" })).toBeUndefined();
    expect(parseOptions("color", null)).toBeNull();
  });

  it("checks answers and words that give the card away", () => {
    const scale = { id: "x", kind: "scale", choices: 10, spice: 1 } as const;
    expect(validAnswer(scale, { n: 10 })).toEqual({ n: 10 });
    expect(validAnswer(scale, { n: 0 })).toBeNull();
    expect(validAnswer(scale, { word: "x" })).toBeNull();
    const word = { id: "w", kind: "word", choices: 0, spice: 1 } as const;
    expect(validAnswer(word, { word: "  " })).toBeNull();
    expect(validAnswer(word, { word: "x".repeat(21) })).toBeNull();
    const card = char("c", "Tanjiro Kamado", ["Tanjirou"]);
    card.origin = "Demon Slayer";
    for (const w of ["tanjiro", "KAMADO!", "demon slayer", "tanjirou"])
      expect(givesAway(w, card)).toBe(true);
    for (const w of ["onigiri", "sword", "slay"])
      expect(givesAway(w, card)).toBe(false);
  });

  it("an impostor stands out far from the crew on a scale, or alone off the crew's answer", () => {
    const imp = { impostors: ["i"] } as unknown as ImpostorMatch;
    const asked = (kind: "scale" | "pick", answers: ImpAsked["answers"]) =>
      ({
        question: { id: "q", kind, choices: 10, spice: 1 },
        answers,
      }) as ImpAsked;
    expect(
      stoodOut(imp, asked("scale", { a: { n: 8 }, b: { n: 9 }, i: { n: 4 } })),
    ).toBe(true);
    expect(
      stoodOut(imp, asked("scale", { a: { n: 8 }, b: { n: 9 }, i: { n: 7 } })),
    ).toBe(false);
    expect(
      stoodOut(imp, asked("pick", { a: { n: 0 }, b: { n: 0 }, i: { n: 1 } })),
    ).toBe(true);
    expect(
      stoodOut(imp, asked("pick", { a: { n: 0 }, b: { n: 1 }, i: { n: 1 } })),
    ).toBe(false);
  });
});
