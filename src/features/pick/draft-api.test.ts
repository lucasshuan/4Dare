import { describe, expect, it } from "vitest";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import {
  draftKey,
  drawHand,
  fromDraft,
  saveOutcome,
  toDraft,
} from "./draft-api";

const item = (id: string, name: string, aliases: string[] = []): SearchItem =>
  toSearchItem({ id, name, origin: "Marvel", imageUrl: null, aliases });
const IRON = item("c-iron", "Iron Man");
const SPIDER = item("c-spider", "Spider-Man", ["Peter Parker"]);
const ITEMS = [IRON, SPIDER];

describe("toDraft", () => {
  it("saves nothing for an empty card or spaces", () => {
    expect(toDraft({ kind: "empty" })).toBeNull();
    expect(toDraft({ kind: "typing", text: "  ", preview: IRON })).toBeNull();
  });

  it("keeps the highlighted row while typing, with the name as typed", () => {
    expect(toDraft({ kind: "typing", text: "Iro", preview: IRON })).toEqual({
      characterId: "c-iron",
      name: "Iro",
      imageUrl: null,
    });
    expect(toDraft({ kind: "typing", text: "Iro", preview: null })).toEqual({
      characterId: null,
      name: "Iro",
      imageUrl: null,
    });
  });

  it("saves a picked character by id and full name, a new one with its picture", () => {
    expect(
      toDraft({
        kind: "picked",
        card: {
          characterId: "c-iron",
          name: "Iron Man",
          origin: "Marvel",
          imageUrl: "x",
        },
        via: "hand",
      }),
    ).toEqual({ characterId: "c-iron", name: "Iron Man", imageUrl: null });
    // another picture chosen in the tray goes with it
    expect(
      toDraft({
        kind: "picked",
        card: {
          characterId: "c-iron",
          name: "Iron Man",
          origin: "Marvel",
          imageUrl: "x",
        },
        via: "hand",
        picture: "/api/files/characters/fat.webp",
      }),
    ).toEqual({
      characterId: "c-iron",
      name: "Iron Man",
      imageUrl: "/api/files/characters/fat.webp",
    });
    expect(
      toDraft({
        kind: "new",
        name: "Chapolin",
        imageUrl: "/api/files/characters/a.webp",
        uploading: false,
      }),
    ).toEqual({
      characterId: null,
      name: "Chapolin",
      imageUrl: "/api/files/characters/a.webp",
    });
  });
});

describe("fromDraft", () => {
  it("restores a picked character without flipping it", () => {
    expect(
      fromDraft(
        { characterId: "c-iron", name: "Iron Man", imageUrl: null },
        ITEMS,
      ),
    ).toEqual({
      kind: "picked",
      card: {
        characterId: "c-iron",
        name: "Iron Man",
        origin: "Marvel",
        imageUrl: null,
      },
      via: "restore",
    });
  });

  it("restores a half-typed name over its row's preview", () => {
    expect(
      fromDraft({ characterId: "c-iron", name: "Iro", imageUrl: null }, ITEMS),
    ).toEqual({ kind: "typing", text: "Iro", preview: IRON });
  });

  it("restores a character picked under an alias, or typed toward one", () => {
    expect(
      fromDraft(
        { characterId: "c-spider", name: "Peter Parker", imageUrl: null },
        ITEMS,
      ),
    ).toEqual({
      kind: "picked",
      card: {
        characterId: "c-spider",
        name: "Peter Parker",
        origin: "Marvel",
        imageUrl: null,
      },
      via: "restore",
    });
    const typed = fromDraft(
      { characterId: "c-spider", name: "Pete", imageUrl: null },
      ITEMS,
    );
    expect(typed?.kind === "typing" && typed.preview?.[1]).toBe("Peter Parker");
  });

  it("waits for the index for a library id, not for a new name", () => {
    expect(
      fromDraft(
        { characterId: "c-iron", name: "Iron Man", imageUrl: null },
        undefined,
      ),
    ).toBeUndefined();
    expect(
      fromDraft(
        { characterId: null, name: "Chapolin", imageUrl: null },
        undefined,
      ),
    ).toEqual({
      kind: "new",
      name: "Chapolin",
      imageUrl: null,
      uploading: false,
    });
    expect(fromDraft(null, undefined)).toEqual({ kind: "empty" });
  });

  it("round-trips through toDraft", () => {
    for (const draft of [
      { characterId: "c-iron", name: "Iron Man", imageUrl: null },
      { characterId: "c-spider", name: "Spi", imageUrl: null },
      {
        characterId: "c-iron",
        name: "Iron Man",
        imageUrl: "/api/files/characters/fat.webp",
      },
      {
        characterId: null,
        name: "Zqxj",
        imageUrl: "/api/files/characters/b.webp",
      },
    ]) {
      const card = fromDraft(draft, ITEMS);
      expect(card).toBeDefined();
      expect(draftKey(toDraft(card as NonNullable<typeof card>))).toBe(
        draftKey(draft),
      );
    }
  });
});

describe("drawHand", () => {
  const hand = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("draws 5 of 8, in the hand's order, the same for the same seed", () => {
    const one = drawHand(hand, "p1:1");
    expect(one).toHaveLength(5);
    expect(one).toEqual(
      [...one].sort((x, y) => hand.indexOf(x) - hand.indexOf(y)),
    );
    expect(drawHand(hand, "p1:1")).toEqual(one);
  });

  it("differs between viewers and matches", () => {
    const draws = new Set(
      ["p1:1", "p2:1", "p3:1", "p1:2", "p2:2"].map((s) =>
        drawHand(hand, s).join(""),
      ),
    );
    expect(draws.size).toBeGreaterThan(1);
  });

  it("keeps a short hand whole", () => {
    expect(drawHand(["a", "b"], "p1:1")).toEqual(["a", "b"]);
  });
});

describe("saveOutcome", () => {
  it("stops only for refusals that close the card", () => {
    expect(saveOutcome({ ok: true, status: 204 })).toBe("saved");
    for (const error of ["already_done", "wrong_phase", "not_member"])
      expect(saveOutcome({ ok: false, status: 409, error })).toBe("closed");
    expect(saveOutcome({ ok: false, status: 403, error: "unauthorized" })).toBe(
      "closed",
    );
    expect(saveOutcome({ ok: false, status: 404 })).toBe("closed");
  });

  it("keeps the card unsaved after a transient failure", () => {
    expect(saveOutcome({ ok: false, status: 409, error: "conflict" })).toBe(
      "retry",
    );
    expect(saveOutcome({ ok: false, status: 429, error: "rate_limited" })).toBe(
      "retry",
    );
    expect(saveOutcome({ ok: false, status: 500, error: "unknown" })).toBe(
      "retry",
    );
    expect(saveOutcome({ ok: false, status: 502 })).toBe("retry");
    expect(saveOutcome({ ok: false, status: 0 })).toBe("retry");
  });
});
