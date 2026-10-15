import { describe, expect, it } from "vitest";
import type { ImpDeal, ImpQuestion } from "@/game/impostor/types";
import { lotsFor, roundsFor } from "@/game/lineup/rules";
import type { LuCard, LuDeck } from "@/game/lineup/types";
import { char, THEMES } from "@/game/test-utils";
import { type LabKit, type LabSettings, simulate } from "./sim";

const Q: ImpQuestion[] = [
  { id: "g-brave", kind: "scale", choices: 10, spice: 1 },
  { id: "g-beach", kind: "pick", choices: 2, spice: 1 },
  { id: "g-food", kind: "word", choices: 0, spice: 2 },
  { id: "g-color", kind: "color", choices: 12, spice: 1 },
  { id: "g-emoji", kind: "emoji", choices: 12, spice: 2 },
];
const deal = (k: string): ImpDeal => ({
  crew: char(`crew-${k}`, `Tanjiro ${k}`),
  impostor: char(`imp-${k}`, `Zenitsu ${k}`),
  spares: [
    { crew: char(`c2-${k}`, "Luffy"), impostor: char(`i2-${k}`, "Zoro") },
  ],
  questions: [...Q, ...Q],
});
const card = (i: number, round: number): LuCard => ({
  id: `wd-${round}-${i}`,
  name: `Card ${round}-${i}`,
  origin: null,
  imageUrl: null,
});
const deck = (lots: number, round: number): LuDeck => ({
  cards: Array.from({ length: lots + 4 }, (_, i) => card(i, round)),
  lots,
  mission: { id: `m${round}`, text: { en: "M", es: "M", ja: "M", pt: "M" } },
  options: [{ id: `m${round}`, text: { en: "M", es: "M", ja: "M", pt: "M" } }],
});

const characters = Array.from({ length: 12 }, (_, i) =>
  char(`c-${i}`, `Name ${i}`),
);
const bot = { characters, questions: ["Sou humano?"], typedTheme: "Robôs" };
const kits: Record<string, LabKit> = {
  "who-am-i": {
    start: { themes: THEMES },
    bot,
    fallback: characters,
    timeoutThemes: THEMES,
  },
  impostor: {
    start: { themes: THEMES, deals: THEMES.map((_, i) => deal(String(i))) },
    bot,
    fallback: characters,
    timeoutThemes: THEMES,
  },
  lineup: {
    start: {
      decks: Array.from({ length: roundsFor(2, null) }, (_, r) =>
        deck(lotsFor(4, 3), r + 1),
      ),
    },
    bot,
    fallback: characters,
    timeoutThemes: THEMES,
  },
};

const base = (game: LabSettings["game"]): LabSettings => ({
  game,
  players: 4,
  seed: 4821,
  match: "first",
  bots: "fast",
  lang: "pt",
});

describe("the lab's match", () => {
  for (const game of ["who-am-i", "impostor", "lineup"] as const)
    it(`plays ${game} to the end with bots`, () => {
      const run = simulate(kits[game], base(game));
      expect(run.stateAt(run.end).phase).toBe("finished");
      expect(run.marks.length).toBeGreaterThan(3);
      // every seat sees the room
      for (let i = 0; i < 4; i++)
        expect(run.viewAt(run.end, i).youId).toBe(run.players[i].id);
    });

  it("gives the same match for the same seed", () => {
    const a = simulate(kits.impostor, base("impostor"));
    const b = simulate(kits.impostor, base("impostor"));
    expect(a.snaps.length).toBe(b.snaps.length);
    expect(JSON.stringify(a.stateAt(a.end))).toBe(
      JSON.stringify(b.stateAt(b.end)),
    );
  });

  it("lets the clock play when the bots wait", () => {
    const run = simulate(kits["who-am-i"], {
      ...base("who-am-i"),
      bots: "clock",
    });
    expect(["finished", "closed"]).toContain(run.stateAt(run.end).phase);
  });

  it("plays the rematch too", () => {
    const run = simulate(kits.lineup, { ...base("lineup"), match: "later" });
    expect(run.stateAt(run.end).round).toBeGreaterThanOrEqual(2);
  });
});
