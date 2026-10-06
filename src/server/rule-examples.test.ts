import { describe, expect, it } from "vitest";
import type { ThemeSet } from "@/game/theme-sets";
import type { Character, Lang, RoomState, Theme } from "@/game/types";
import type { ThemeStarter } from "./backend/types";
import {
  type ExampleSources,
  ruleExamples,
  ruleExamplesFor,
  voteExamples,
} from "./rule-examples";
import type { PickStat } from "./theme-picks";

// A small made-up library: every id has a picture and names in en, es, ja and
// pt unless listed below.
const NO_PICTURE = new Set(["wd-Q1"]);
const NO_PT = new Set(["wd-Q5"]);
const NO_JA = new Set(["wd-Q3"]);
const MISSING = new Set(["wd-Q404"]);
/** Real names where a test needs them (the same in every language). */
const NAMES: Record<string, string> = {
  "wd-Q100": "Lisa Simpson",
  "wd-Q101": "Bart Simpson",
  "wd-Q20": "Lisa",
};

const name = (id: string, lang: Lang) => NAMES[id] ?? `${id} ${lang}`;

function library(id: string, lang: Lang): Character | null {
  if (MISSING.has(id)) return null;
  if (lang === "pt" && NO_PT.has(id)) return null;
  if (lang === "ja" && NO_JA.has(id)) return null;
  return {
    id: `${lang}-${id}`,
    lang,
    name: name(id, lang),
    origin: null,
    imageUrl: NO_PICTURE.has(id) ? null : `https://img.test/${id}.png`,
    aliases: [],
  };
}

const theme = (en: string, set: ThemeSet | null): Theme => ({
  en,
  es: en,
  pt: en,
  ja: en,
  set,
});

const starters = (
  themeId: string,
  set: ThemeSet,
  kind: ThemeStarter["kind"] | ThemeStarter["kind"][],
  ids: string[],
): ThemeStarter[] =>
  ids.map((characterId, i) => ({
    themeId,
    set,
    characterId,
    lang: "all",
    position: i + 1,
    kind: Array.isArray(kind) ? kind[i] : kind,
  }));

const STARTERS: ThemeStarter[] = [
  // a fiction theme: the first starter has no picture, the fourth no pt name
  ...starters("superheroes", "heroes", "fictional", [
    "wd-Q1",
    "wd-Q2",
    "wd-Q3",
    "wd-Q5",
    "wd-Q4",
  ]),
  // where real people come from for a fiction theme's ✗
  ...starters("soccer-players", "sports", "human", ["wd-Q10", "wd-Q11"]),
  ...starters("female-singers", "music", "human", ["wd-Q20", "wd-Q21"]),
  // where made-up characters come from for a real theme's ✗
  ...starters("looney-tunes-characters", "cartoons", "fictional", [
    "wd-Q30",
    "wd-Q31",
  ]),
  ...starters("nintendo-characters", "games", "fictional", ["al-32"]),
  // real people, but not a source: actors play characters
  ...starters("actors", "celebs", "human", ["wd-Q70", "wd-Q71"]),
  // a real theme
  ...starters("presidents", "history", "human", ["wd-Q60", "wd-Q61"]),
  // a real-people set, but its starters are made up too: unsure, no ✗
  ...starters("kings", "history", ["human", "fictional"], ["wd-Q50", "wd-Q51"]),
  // a cross-cutting set: anyone could fit, no ✗
  ...starters("characters-with-glasses", "looks", "fictional", [
    "wd-Q40",
    "wd-Q41",
  ]),
  // writers are real people in a set of stories: no ✗
  ...starters("writers", "books", "human", ["wd-Q80", "wd-Q81"]),
  // one usable starter (the other is missing from the library)
  ...starters("dragons", "myths", "fictional", ["wd-Q90", "wd-Q404"]),
];

function sources(
  history: Record<string, PickStat[]> = {},
  rows: ThemeStarter[] = STARTERS,
): ExampleSources & { lookups: string[][] } {
  const lookups: string[][] = [];
  return {
    lookups,
    starters: async () => rows,
    themeStats: async (id) => history[id] ?? [],
    getMany: async (ids, lang) => {
      lookups.push(ids);
      return ids.flatMap((id) => {
        const c = library(id.slice(3), lang);
        return c ? [c] : [];
      });
    },
  };
}

const card = (id: string, ja = true) => ({
  id,
  imageUrl: `https://img.test/${id}.png`,
  names: {
    en: name(id, "en"),
    pt: name(id, "pt"),
    ...(ja ? { ja: name(id, "ja") } : {}),
    es: name(id, "es"),
  },
});

describe("ruleExamples", () => {
  it("shows the first two starters that have a picture and their names", async () => {
    const r = await ruleExamples(theme("Superheroes", "heroes"), sources());
    // wd-Q1 has no picture; wd-Q3 has no Japanese name, which is fine
    expect(r?.fits).toEqual([card("wd-Q2"), card("wd-Q3", false)]);
  });

  it("gives a fiction theme a real athlete or musician as its ✗, never its own", async () => {
    const r = await ruleExamples(theme("Superheroes", "heroes"), sources());
    expect(["wd-Q10", "wd-Q11", "wd-Q20", "wd-Q21"]).toContain(r?.misfit?.id);
  });

  it("gives a real theme a cartoon or game character as its ✗", async () => {
    const r = await ruleExamples(theme("Presidents", "history"), sources());
    expect(r?.fits.map((c) => c.id)).toEqual(["wd-Q60", "wd-Q61"]);
    expect(["wd-Q30", "wd-Q31", "al-32"]).toContain(r?.misfit?.id);
  });

  it("is the same for a theme every time", async () => {
    const themes = [
      theme("Superheroes", "heroes"),
      theme("Presidents", "history"),
      theme("Dragons", "myths"),
    ];
    const first = await ruleExamplesFor(themes, sources());
    const again = await ruleExamplesFor([...themes].reverse(), sources());
    expect([...again].reverse()).toEqual(first);
  });

  it("leaves the ✗ out where almost anyone could fit, or the theme is mixed", async () => {
    const [glasses, kings, writers] = await ruleExamplesFor(
      [
        theme("Characters with glasses", "looks"),
        theme("Kings", "history"),
        theme("Writers", "books"),
      ],
      sources(),
    );
    expect(glasses).toEqual({
      fits: [card("wd-Q40"), card("wd-Q41")],
      misfit: null,
    });
    expect(kings?.misfit).toBeNull();
    expect(writers?.misfit).toBeNull();
  });

  it("fills in from the theme's history when it has too few starters, best first", async () => {
    const picked = (id: string, lang: Lang, picks: number): PickStat => ({
      id,
      lang,
      picks,
      suggested: 0,
      fits: 0,
      misfits: 0,
    });
    const history = {
      dragons: [
        picked("u-made-up", "pt", 9), // a player's character: one language only
        picked("wd-Q91", "pt", 1),
        picked("wd-Q92", "ja", 3), // every language counts alike here
        picked("wd-Q90", "en", 5), // already a starter
      ],
    };
    const r = await ruleExamples(theme("Dragons", "myths"), sources(history));
    expect(r?.fits.map((c) => c.id)).toEqual(["wd-Q90", "wd-Q92"]);
  });

  it("leaves a language's own starters out: the whole room sees the same cards", async () => {
    const own = starters("superheroes", "heroes", "fictional", [
      "wd-Q93",
      "wd-Q94",
    ]).map((s) => ({ ...s, lang: "pt" as const }));
    const r = await ruleExamples(
      theme("Superheroes", "heroes"),
      sources({}, [...own, ...STARTERS]),
    );
    expect(r?.fits.map((c) => c.id)).toEqual(
      (await ruleExamples(theme("Superheroes", "heroes"), sources()))?.fits.map(
        (c) => c.id,
      ),
    );
    expect(r?.fits.map((c) => c.id)).not.toContain("wd-Q93");
  });

  it("shows only the sentence when even the history can't give two", async () => {
    expect(await ruleExamples(theme("Dragons", "myths"), sources())).toBeNull();
    // a theme with no starters at all, nor history
    expect(await ruleExamples(theme("New theme", "screen"), sources())).toBe(
      null,
    );
  });

  it("gives a typed theme nothing, and looks everything up in one read per language", async () => {
    const src = sources();
    const out = await ruleExamplesFor(
      [
        theme("Superheroes", "heroes"),
        theme("Something typed", null),
        theme("Presidents", "history"),
      ],
      src,
    );
    expect(out[1]).toBeNull();
    expect(src.lookups).toHaveLength(4);
  });

  it("never gives a ✗ that shares its name with one of the theme's own", async () => {
    // the only real people: Lisa (a singer), and a footballer, for "The Simpsons characters"
    const rows = [
      ...starters("the-simpsons-characters", "cartoons", "fictional", [
        "wd-Q100",
        "wd-Q101",
      ]),
      ...starters("female-singers", "music", "human", ["wd-Q20"]),
      ...starters("soccer-players", "sports", "human", ["wd-Q10"]),
    ];
    const r = await ruleExamples(
      theme("The Simpsons characters", "cartoons"),
      sources({}, rows),
    );
    expect(r?.misfit?.id).toBe("wd-Q10");
  });

  it("draws the ✗ only from the clearest starters of its sets", async () => {
    // the third singer is the only one left once the first two are this theme's own
    const rows = [
      ...STARTERS.filter((s) => s.set !== "sports" && s.set !== "music"),
      ...starters("female-singers", "music", "human", [
        "wd-Q2",
        "wd-Q3",
        "wd-Q22",
      ]),
    ];
    const r = await ruleExamples(
      theme("Superheroes", "heroes"),
      sources({}, rows),
    );
    expect(r?.misfit).toBeNull();
  });

  it("skips ✗ candidates that can't be shown", async () => {
    // only one real person to choose from, and the library lacks them
    const rows = [
      ...STARTERS.filter((s) => s.set !== "sports" && s.set !== "music"),
      ...starters("boxers", "sports", "human", ["wd-Q404", "wd-Q5"]),
    ];
    const r = await ruleExamples(
      theme("Superheroes", "heroes"),
      sources({}, rows),
    );
    expect(r?.fits).toHaveLength(2);
    expect(r?.misfit).toBeNull();
  });
});

describe("voteExamples", () => {
  const room = (round: number) => ({ round }) as RoomState;
  const themes = [
    theme("Superheroes", "heroes"),
    theme("Presidents", "history"),
    theme("Dragons", "myths"),
  ];

  it("sends cards only on a room's first match", async () => {
    const first = await voteExamples(room(0), themes, sources());
    expect(first).toHaveLength(3);
    expect(first?.[2]).toBeNull();
    expect(await voteExamples(room(1), themes, sources())).toBeUndefined();
  });

  it("sends cards on a later match when a newcomer is seated", async () => {
    expect(await voteExamples(room(1), themes, sources(), true)).toHaveLength(
      3,
    );
  });

  it("never stands in the way of the match", async () => {
    const broken: ExampleSources = {
      ...sources(),
      starters: async () => {
        throw new Error("offline");
      },
    };
    expect(await voteExamples(room(0), themes, broken)).toBeUndefined();
    // nothing to show for any theme: nothing sent
    expect(
      await voteExamples(room(0), themes, sources({}, [])),
    ).toBeUndefined();
  });
});
