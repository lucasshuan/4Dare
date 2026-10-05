import { describe, expect, it } from "vitest";
import type { Character, Lang } from "@/game/types";
import type { ThemeStarter } from "./backend/types";
import {
  buildHand,
  drawFit,
  HAND_SIZE,
  headStart,
  type PickStat,
  pickKey,
  rankTheme,
  startersFor,
} from "./theme-picks";

const character = (id: string, lang: Lang): Character => ({
  id,
  lang,
  name: id,
  origin: null,
  imageUrl: null,
  aliases: [],
});

const stat = (
  id: string,
  lang: Lang,
  counts: Partial<Omit<PickStat, "id" | "lang">> = {},
): PickStat => ({
  id,
  lang,
  picks: 0,
  suggested: 0,
  fits: 0,
  misfits: 0,
  ...counts,
});

/** Starters of one theme: shared ones ("all") or a language's own, by position. */
const starters = (lang: Lang | "all", ids: string[]): ThemeStarter[] =>
  ids.map((characterId, i) => ({
    themeId: "famous-people-from-the-90s",
    set: "celebs",
    characterId,
    lang,
    position: i + 1,
    kind: "human",
  }));

const order = (
  stats: PickStat[],
  list: ThemeStarter[],
  lang: Lang | null = "pt",
) => rankTheme(stats, list, lang).map((f) => f.id);

describe("pickKey", () => {
  it("drops the language from library ids so every language adds up", () => {
    expect(pickKey("pt-wd-Q302")).toBe("wd-Q302");
    expect(pickKey("ja-al-40")).toBe("al-40");
    expect(pickKey("u-123")).toBe("u-123");
  });

  it("skips the clock's stand-ins, unsaved draft names and empty picks", () => {
    expect(pickKey("emergency-en-0")).toBeNull();
    expect(pickKey("draft-ABCDE-1-p1")).toBeNull();
    expect(pickKey(null)).toBeNull();
  });
});

describe("starters", () => {
  it("give less of a head start further down the list", () => {
    expect([1, 2, 3, 5].map((p) => headStart(p).toFixed(2))).toEqual([
      "8.00",
      "6.40",
      "5.33",
      "4.00",
    ]);
  });

  it("rank a language's own first, the shared ones close behind, interleaved", () => {
    const list = [
      ...starters("all", ["wd-Q1", "wd-Q2"]),
      ...starters("pt", ["wd-Q10", "wd-Q11"]),
      ...starters("ja", ["wd-Q20"]),
    ];
    expect(order([], list, "pt")).toEqual([
      "wd-Q10",
      "wd-Q1",
      "wd-Q11",
      "wd-Q2",
    ]);
    // another language never sees them; one without its own sees the shared ones whole
    expect(order([], list, "en")).toEqual(["wd-Q1", "wd-Q2"]);
    expect(startersFor(list, "en").get("wd-Q1")).toBe(8);
    expect(startersFor(list, "pt").get("wd-Q1")).toBeCloseTo(6.4);
    // every language alike: the shared ones alone
    expect(order([], list, null)).toEqual(["wd-Q1", "wd-Q2"]);
  });
});

describe("rankTheme", () => {
  it("weighs the players' own language over the others", () => {
    const stats = [
      stat("wd-Q1", "en", { picks: 4 }),
      stat("wd-Q2", "pt", { picks: 2 }),
    ];
    expect(order(stats, [], "pt")).toEqual(["wd-Q2", "wd-Q1"]);
    expect(order(stats, [], "en")).toEqual(["wd-Q1", "wd-Q2"]);
    // every language alike, the most picked leads
    expect(order(stats, [], null)).toEqual(["wd-Q1", "wd-Q2"]);
  });

  it("counts a pick the hand or the dice offered at half", () => {
    const stats = [
      stat("wd-Q1", "pt", { suggested: 3 }),
      stat("wd-Q2", "pt", { picks: 2 }),
    ];
    expect(order(stats, [])).toEqual(["wd-Q2", "wd-Q1"]);
  });

  it("lets every “no” bite and leaves out the voted out", () => {
    const stats = [
      stat("wd-Q1", "pt", { picks: 3, misfits: 2 }),
      stat("wd-Q2", "pt", { picks: 2, fits: 1 }),
      stat("wd-Q3", "pt", { picks: 5, misfits: 4 }),
    ];
    expect(order(stats, [])).toEqual(["wd-Q2", "wd-Q1"]);
    // a starter takes more "no"s before it goes
    const list = starters("all", ["wd-Q3"]);
    expect(order(stats, list)).toContain("wd-Q3");
    expect(
      order([stat("wd-Q3", "pt", { misfits: 8 })], list).includes("wd-Q3"),
    ).toBe(false);
  });

  it("lets a character players keep choosing overtake the starters as history grows", () => {
    const list = starters("all", ["wd-Q1"]);
    const liked = stat("wd-Q2", "pt", { picks: 5, fits: 2 });
    // a young theme: the starter still leads
    expect(order([liked], list)).toEqual(["wd-Q1", "wd-Q2"]);
    // the theme has history: the head start has faded
    const busy = stat("wd-Q3", "pt", { picks: 35 });
    expect(order([liked, busy], list).indexOf("wd-Q2")).toBeLessThan(
      order([liked, busy], list).indexOf("wd-Q1"),
    );
  });

  it("shows raw counts from every language, ties broken by id", () => {
    const ranked = rankTheme(
      [
        stat("wd-Q1", "pt", { picks: 1, suggested: 1, fits: 2 }),
        stat("wd-Q1", "en", { picks: 1, fits: 1, misfits: 1 }),
        stat("wd-Q3", "pt", { picks: 1 }),
        stat("wd-Q2", "pt", { picks: 1 }),
      ],
      [],
      "pt",
    );
    expect(ranked[0]).toMatchObject({ id: "wd-Q1", picks: 3, fits: 3 });
    expect(ranked.map((f) => f.id)).toEqual(["wd-Q1", "wd-Q2", "wd-Q3"]);
  });

  it("is empty for a theme with neither history nor starters", () => {
    expect(rankTheme([], [], "en")).toEqual([]);
  });
});

/** Every library id exists in every language; ids listed in `gone` don't. */
const store =
  (gone: string[] = [], noPicture: string[] = []) =>
  async (ids: string[]) =>
    ids.flatMap((id) => {
      const [lang, ...rest] = id.split("-");
      const key = rest.join("-");
      if (gone.includes(key)) return [];
      return [
        {
          ...character(id, lang as Lang),
          imageUrl: noPicture.includes(key) ? null : `https://img.test/${key}`,
        },
      ];
    });

describe("drawFit", () => {
  const ranked = rankTheme(
    Array.from({ length: 8 }, (_, i) =>
      stat(`wd-Q${i}`, "pt", { picks: 8 - i }),
    ),
    [],
    "pt",
  );
  const draw = (
    lang: Lang,
    options: { taken?: string[]; skip?: string; gone?: string[] } = {},
    roll = 0,
  ) =>
    drawFit(
      ranked,
      lang,
      new Set(options.taken ?? []),
      options.skip ?? null,
      store(options.gone),
      () => roll,
    );

  it("returns a character in the picker's language", async () => {
    expect((await draw("ja"))?.id).toBe("ja-wd-Q0");
  });

  it("weights the draw by score", async () => {
    expect((await draw("pt", {}, 0.999))?.id).toBe("pt-wd-Q7");
    // the best fit takes the biggest slice: 8 of 36 picks
    expect((await draw("pt", {}, 0.2))?.id).toBe("pt-wd-Q0");
  });

  it("leaves out characters already picked in the match, and the one drawn last", async () => {
    expect((await draw("pt", { taken: ["wd-Q0"] }))?.id).toBe("pt-wd-Q1");
    expect((await draw("pt", { skip: "wd-Q0" }))?.id).toBe("pt-wd-Q1");
  });

  it("shows the last one again rather than failing, and says no when nothing is free", async () => {
    const one = rankTheme([stat("wd-Q0", "pt", { picks: 1 })], [], "pt");
    expect(
      (await drawFit(one, "pt", new Set(), "wd-Q0", store(), () => 0))?.id,
    ).toBe("pt-wd-Q0");
    expect(
      await drawFit(one, "pt", new Set(["wd-Q0"]), null, store(), () => 0),
    ).toBeNull();
    expect(
      await drawFit([], "pt", new Set(), null, store(), () => 0),
    ).toBeNull();
  });

  it("skips characters missing in the language", async () => {
    expect((await draw("pt", { gone: ["wd-Q0"] }))?.id).toBe("pt-wd-Q1");
  });
});

describe("buildHand", () => {
  it("deals the best fits with their counts, pictures first, up to the hand size", async () => {
    const list = starters(
      "all",
      Array.from({ length: 12 }, (_, i) => `wd-Q${i + 1}`),
    );
    const ranked = rankTheme(
      [stat("wd-Q50", "pt", { picks: 9, fits: 3 })],
      list,
      "pt",
    );
    const hand = await buildHand(ranked, "pt", store(["wd-Q2"], ["wd-Q1"]));
    expect(hand).toHaveLength(HAND_SIZE);
    expect(hand[0]).toMatchObject({ id: "pt-wd-Q50", picks: 9, fits: 3 });
    expect(hand.map((c) => c.id)).not.toContain("pt-wd-Q2");
    // the one without a picture sank past the cut
    expect(hand.map((c) => c.id)).not.toContain("pt-wd-Q1");
    expect(hand[1]).toMatchObject({ id: "pt-wd-Q3", picks: 0, fits: 0 });
  });

  it("is empty for a theme with neither history nor starters", async () => {
    expect(await buildHand([], "en", store())).toEqual([]);
  });
});
