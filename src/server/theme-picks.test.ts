import { describe, expect, it } from "vitest";
import type { MatchRecord, PlayerRecord } from "@/game/record";
import type { Character, Lang } from "@/game/types";
import {
  buildHand,
  drawPopular,
  drawWeight,
  HAND_SIZE,
  MIN_RANDOM_PICKS,
  pickKey,
  rankPopular,
  STARTER_PICKS,
  tallyFeedback,
  tallyPicks,
  topPicks,
  withStarters,
} from "./theme-picks";

const player = (
  characterId: string | null,
  autoPicked = false,
): PlayerRecord => ({
  userId: `u${Math.random()}`,
  wasGuest: true,
  lang: "pt",
  pickedById: null,
  characterId,
  characterName: null,
  characterOrigin: null,
  autoPicked,
  result: "discovered",
  place: 1,
  discoveredAt: 1,
  questions: 1,
  guesses: 1,
  timeMs: 1,
});

const match = (
  theme: string,
  players: PlayerRecord[],
  withId = true,
): MatchRecord => ({
  id: `m${Math.random()}`,
  roomCode: "ABCDE",
  round: 1,
  theme: { en: theme, pt: theme, ja: theme, set: "heroes" },
  themeId: withId ? theme.toLowerCase() : null,
  startedAt: 0,
  finishedAt: 1,
  players,
});

const character = (id: string, lang: Lang): Character => ({
  id,
  lang,
  name: id,
  origin: null,
  imageUrl: null,
  aliases: [],
});

describe("pickKey", () => {
  it("drops the language from library ids so every language adds up", () => {
    expect(pickKey("pt-wd-Q302")).toBe("wd-Q302");
    expect(pickKey("ja-al-40")).toBe("al-40");
    expect(pickKey("u-123")).toBe("u-123");
  });
  it("skips the clock's stand-ins, unsaved draft names and empty picks", () => {
    expect(pickKey("emergency-pt-0")).toBeNull();
    expect(pickKey("draft-ABCDE-1-p2")).toBeNull();
    expect(pickKey(null)).toBeNull();
  });
});

describe("tallyPicks", () => {
  it("counts picks per theme, leaving out what the clock picked", () => {
    const tally = tallyPicks([
      match("Villains", [player("pt-wd-Q1"), player("en-wd-Q1")]),
      match("Villains", [player("pt-wd-Q2"), player("pt-wd-Q3", true)]),
      match("Heroes", [player("pt-wd-Q1")]),
    ]);
    expect(topPicks(tally.get("villains"), 10)).toEqual([
      { id: "wd-Q1", picks: 2 },
      { id: "wd-Q2", picks: 1 },
    ]);
    expect(topPicks(tally.get("heroes"), 10)).toEqual([
      { id: "wd-Q1", picks: 1 },
    ]);
  });
  it("keeps adding to an existing tally", () => {
    const tally = tallyPicks([match("Villains", [player("pt-wd-Q1")])]);
    tallyPicks([match("Villains", [player("pt-wd-Q1")])], tally);
    expect(tally.get("villains")?.get("wd-Q1")).toBe(2);
  });
});

describe("drawPopular", () => {
  const popular = Array.from({ length: 8 }, (_, i) => ({
    id: `wd-Q${i}`,
    picks: 8 - i,
  }));
  /** Every library id exists in every language; ids listed in `gone` don't. */
  const store =
    (gone: string[] = [], others: Character[] = []) =>
    async (ids: string[]) =>
      ids.flatMap((id) => {
        if (gone.includes(id)) return [];
        const other = others.find((c) => c.id === id);
        if (other) return [other];
        const [lang] = id.split("-");
        return [character(id, lang as Lang)];
      });
  const draw = (
    lang: Lang,
    options: {
      taken?: string[];
      skip?: string;
      list?: typeof popular;
      resolve?: ReturnType<typeof store>;
    } = {},
    roll = 0,
  ) =>
    drawPopular(
      options.list ?? popular,
      lang,
      new Set(options.taken ?? []),
      options.skip ?? null,
      options.resolve ?? store(),
      () => roll,
    );

  it("returns a character in the picker's language", async () => {
    expect((await draw("ja"))?.id).toBe("ja-wd-Q0");
  });

  it("weights the draw by how often each was picked", async () => {
    // 36 picks in all; a roll just past the first 8 lands on the second.
    expect((await draw("pt", {}, 8.5 / 36))?.id).toBe("pt-wd-Q1");
  });

  it("leaves out characters already picked in the match, in any language", async () => {
    expect((await draw("pt", { taken: ["wd-Q0"] }))?.id).toBe("pt-wd-Q1");
  });

  it("says no when the theme has too little history", async () => {
    const few = popular.slice(0, MIN_RANDOM_PICKS - 1);
    expect(await draw("pt", { list: few })).toBeNull();
  });

  it("works from a single past pick, showing it again rather than failing", async () => {
    expect(MIN_RANDOM_PICKS).toBe(1);
    const one = popular.slice(0, 1);
    expect((await draw("pt", { list: one }))?.id).toBe("pt-wd-Q0");
    // "draw another" with nothing else: the same one comes back
    expect((await draw("pt", { list: one, skip: "wd-Q0" }))?.id).toBe(
      "pt-wd-Q0",
    );
    const two = popular.slice(0, 2);
    expect((await draw("pt", { list: two, skip: "wd-Q0" }))?.id).toBe(
      "pt-wd-Q1",
    );
    expect(await draw("pt", { list: one, taken: ["wd-Q0"] })).toBeNull();
  });

  it("each “no” halves a character's chance; likes add to its picks", async () => {
    expect(drawWeight({ id: "a", picks: 4 })).toBe(4);
    expect(drawWeight({ id: "a", picks: 4, likes: 2, dislikes: 1 })).toBe(3);
    expect(drawWeight({ id: "a", picks: 4, dislikes: 2 })).toBe(1);
    // Q0 has the most picks but four "no"s: it falls to the bottom
    const rated = popular.map((p) =>
      p.id === "wd-Q0" ? { ...p, dislikes: 4 } : p,
    );
    expect((await draw("pt", { list: rated }))?.id).toBe("pt-wd-Q1");
    // a roll at the very end of the range lands on the weakest: Q0 now
    expect((await draw("pt", { list: rated }, 0.9999))?.id).toBe("pt-wd-Q0");
  });

  it("skips characters that no longer exist or are in another language", async () => {
    const list = [{ id: "u-1", picks: 100 }, ...popular];
    const resolve = store(["pt-wd-Q0"], [character("u-1", "en")]);
    expect((await draw("pt", { list, resolve }))?.id).toBe("pt-wd-Q1");
  });

  it("counts history beyond the first 20 when some drop out", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      id: `wd-Q${i}`,
      picks: 30 - i,
    }));
    // all 30 are gone in this language: nothing to draw
    const gone = many.map((p) => `pt-${p.id}`);
    expect(await draw("pt", { list: many, resolve: store(gone) })).toBeNull();
    // the top 25 are gone: the draw reaches past the first 20
    const fewerGone = gone.slice(0, 25);
    expect(
      (await draw("pt", { list: many, resolve: store(fewerGone) }))?.id,
    ).toBe("pt-wd-Q25");
  });
});

describe("withStarters", () => {
  it("lets the draw work from the starters alone", async () => {
    const pool = withStarters([], ["wd-Q1", "wd-Q2"]);
    expect(pool).toEqual([
      { id: "wd-Q1", picks: STARTER_PICKS },
      { id: "wd-Q2", picks: STARTER_PICKS },
    ]);
    const c = await drawPopular(
      pool,
      "pt",
      new Set(),
      null,
      async (ids) => ids.map((id) => character(id, "pt")),
      () => 0,
    );
    expect(c?.id).toBe("pt-wd-Q1");
  });

  it("adds to a starter's real picks and keeps its votes", () => {
    const popular = [
      { id: "wd-Q1", picks: 2, dislikes: 1 },
      { id: "wd-Q3", picks: 5 },
    ];
    expect(withStarters(popular, ["wd-Q1", "wd-Q2"])).toEqual([
      { id: "wd-Q1", picks: 2 + STARTER_PICKS, dislikes: 1 },
      { id: "wd-Q3", picks: 5 },
      { id: "wd-Q2", picks: STARTER_PICKS },
    ]);
  });
});

describe("tallyFeedback", () => {
  it("counts likes and dislikes per theme and character", () => {
    const t = tallyFeedback([
      { themeId: "villains", characterId: "wd-Q1", userId: "a", liked: false },
      { themeId: "villains", characterId: "wd-Q1", userId: "b", liked: false },
      { themeId: "villains", characterId: "wd-Q1", userId: "c", liked: true },
      { themeId: "robots", characterId: "wd-Q1", userId: "a", liked: true },
    ]);
    expect(t.get("villains")?.get("wd-Q1")).toEqual({ likes: 1, dislikes: 2 });
    expect(t.get("robots")?.get("wd-Q1")).toEqual({ likes: 1, dislikes: 0 });
  });
});

describe("rankPopular", () => {
  it("orders what exists in the language by weight, then id, and drops the voted out", async () => {
    const resolve = async (ids: string[]) =>
      ids
        .filter((id) => id !== "pt-wd-Q9")
        .map((id) => character(id, id.startsWith("u-") ? "en" : "pt"));
    const ranked = await rankPopular(
      [
        { id: "wd-Q2", picks: 1 },
        { id: "wd-Q1", picks: 1 },
        { id: "wd-Q3", picks: 5, dislikes: 1 },
        { id: "wd-Q9", picks: 9 }, // gone in Portuguese
        { id: "u-1", picks: 9 }, // made in English
        { id: "wd-Q4", picks: 0 },
      ],
      "pt",
      resolve,
    );
    expect(ranked.map((r) => r.character.id)).toEqual([
      "pt-wd-Q3",
      "pt-wd-Q1",
      "pt-wd-Q2",
    ]);
    expect(ranked[0].pick).toEqual({ id: "wd-Q3", picks: 5, dislikes: 1 });
  });
});

describe("buildHand", () => {
  /** Library ids exist in every language with a picture, except the ones listed. */
  const resolver =
    (noPicture: string[] = [], gone: string[] = []) =>
    async (ids: string[]) =>
      ids.flatMap((id) => {
        const [lang, ...rest] = id.split("-");
        const key = rest.join("-");
        if (gone.includes(key)) return [];
        return [
          {
            ...character(id, lang as Lang),
            imageUrl: noPicture.includes(key)
              ? null
              : `https://img.test/${key}`,
          },
        ];
      });

  it("puts history with real signal first, then the starters, each once", async () => {
    const hand = await buildHand(
      [
        { id: "wd-Q1", picks: 1 }, // one pick and no like: not enough signal
        { id: "wd-Q2", picks: 2 },
        { id: "wd-Q3", picks: 1, likes: 1 },
        { id: "wd-Q4", picks: 3, likes: 2 },
      ],
      ["wd-Q10", "wd-Q2", "wd-Q1", "wd-Q11"],
      "ja",
      resolver(),
    );
    expect(hand.map((c) => c.id)).toEqual([
      "ja-wd-Q4",
      "ja-wd-Q2",
      "ja-wd-Q3",
      "ja-wd-Q10",
      "ja-wd-Q1",
      "ja-wd-Q11",
    ]);
    // the counts come along: the heart shows likes only when there are some
    expect(hand[0]).toMatchObject({ lang: "ja", picks: 3, likes: 2 });
    expect(hand.find((c) => c.id === "ja-wd-Q1")).toMatchObject({
      picks: 1,
      likes: 0,
    });
    expect(hand.find((c) => c.id === "ja-wd-Q10")).toMatchObject({
      picks: 0,
      likes: 0,
    });
  });

  it("shows pictures first, skips what the language lacks, and stops at the hand size", async () => {
    const starters = Array.from({ length: 12 }, (_, i) => `wd-Q${i + 1}`);
    const hand = await buildHand(
      [],
      starters,
      "pt",
      resolver(["wd-Q1"], ["wd-Q2"]),
    );
    expect(hand).toHaveLength(HAND_SIZE);
    expect(hand[0].id).toBe("pt-wd-Q3");
    expect(hand.map((c) => c.id)).not.toContain("pt-wd-Q2");
    // the one without a picture sank past the cut
    expect(hand.map((c) => c.id)).not.toContain("pt-wd-Q1");
  });

  it("is empty for a theme with neither history nor starters", async () => {
    expect(await buildHand([], [], "en", resolver())).toEqual([]);
  });
});
