import { describe, expect, it } from "vitest";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import { draftKey, drawHand, fromDraft, toDraft } from "./draft-api";

const item = (id: string, name: string): SearchItem =>
  toSearchItem({ id, name, origin: "Marvel", imageUrl: null, aliases: [] });
const IRON = item("c-iron", "Iron Man");
const SPIDER = item("c-spider", "Spider-Man");
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
