import { describe, expect, it } from "vitest";
import { stageFrame } from "../stage";
import {
  LAB_DEFAULTS,
  LAB_SHOWS,
  type LabParams,
  parseLabParams,
} from "./params";
import { labRoom, labTime } from "./scenarios";

const variants: Partial<LabParams>[] = [];
for (const players of [2, 3, 4] as const)
  for (const match of ["first", "later"] as const)
    for (const typed of [false, true])
      for (const timeout of [false, true])
        variants.push({ players, match, typed, timeout, you: players - 1 });

describe("the lab's room", () => {
  it.each(variants)("plays a whole match: %o", (v) => {
    const room = labRoom({ ...LAB_DEFAULTS, ...v });
    const times = LAB_SHOWS.map((s) => room.marks[s]);
    for (let i = 1; i < times.length; i++)
      expect(times[i]).toBeGreaterThan(times[i - 1]);
    const at = (show: (typeof LAB_SHOWS)[number], s = 0.05) =>
      room.view(labTime(room, show, s));
    expect(at("lobby").phase).toBe("lobby");
    expect(at("opening").reveal?.kind).toBe("opening");
    expect(at("opening").reveal).toMatchObject({ first: v.match === "first" });
    expect(at("vote").phase).toBe(v.typed ? "theming" : "voting");
    expect(at("theme").reveal?.kind).toBe("theme");
    expect(at("pick").phase).toBe("picking");
    expect(at("cast").reveal?.kind).toBe("cast");
    expect(at("turn").phase).toBe("asking");
    expect(at("result").phase).toBe("finished");
    expect(room.view(room.end).youId).toBe(room.viewer);
  });

  it("a tie spins, the rule shows its cards or the sentence", () => {
    const tie = labRoom({ ...LAB_DEFAULTS, tie: true });
    const now = labTime(tie, "theme", 0.1);
    expect(stageFrame(tie.view(now), now).beat?.kind).toBe("tie_spin");
    const cards = labRoom({ ...LAB_DEFAULTS });
    expect(cards.view(labTime(cards, "theme", 0.1)).reveal).toMatchObject({
      rule: { misfit: { id: "lab-e3" } },
    });
    const sentence = labRoom({ ...LAB_DEFAULTS, rule: "sentence" });
    expect(sentence.view(labTime(sentence, "theme", 0.1)).reveal).toMatchObject(
      { rule: null },
    );
  });

  it("long names are 16-character guests", () => {
    const room = labRoom({ ...LAB_DEFAULTS, names: "long", lang: "pt" });
    expect(
      room
        .view(room.start)
        .players.every((p) => p.isGuest && [...p.name].length === 16),
    ).toBe(true);
  });

  it("reads its settings from the URL and drops what it doesn't know", () => {
    expect(
      parseLabParams(
        { show: "cast", at: "2.5", players: "3", you: "9", tie: "1", set: "x" },
        "pt",
      ),
    ).toMatchObject({
      lang: "pt",
      show: "cast",
      at: 2.5,
      players: 3,
      you: 2,
      tie: true,
      set: LAB_DEFAULTS.set,
    });
  });
});
