import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { THEME_SET_KEYS, THEME_SETS, type ThemeSet } from "@/game/theme-sets";
import type { Localized, Theme } from "@/game/types";
import bankFile from "../../data/themes.json";
import type { ThemeSource, ThemeStore } from "./backend/types";
import { background } from "./background";

const FALLBACK: Theme[] = [
  { en: "Villains", pt: "Vilões", ja: "悪役", set: "heroes" },
  { en: "Robots", pt: "Robôs", ja: "ロボット", set: "scifi" },
  {
    en: "Rich characters",
    pt: "Personagens ricos",
    ja: "お金持ちのキャラクター",
    set: "quirks",
  },
];

/** data/themes.json, the built-in theme list (bundled, so it ships with the server). */
export function themeBank(): Theme[] {
  const list = bankFile as Theme[];
  return list.length >= 3 ? list : FALLBACK;
}

const same = (a: Localized, b: Localized) =>
  a.en.toLowerCase() === b.en.toLowerCase();

/** How long a server keeps the theme list before reading it again. */
const LIST_TTL = 10 * 60_000;

const shuffled = <T>(items: T[]) =>
  items
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

/**
 * `count` different themes from `sets` (every set when left out), avoiding
 * `avoid`. When the sets run short, the avoided ones come back first, then
 * themes from the other sets.
 */
function pickFrom(
  all: Theme[],
  avoid: Localized[],
  count: number,
  sets?: readonly ThemeSet[],
): Theme[] {
  const avoided = (t: Theme) => avoid.some((a) => same(a, t));
  const inSets = (t: Theme) => !sets || (!!t.set && sets.includes(t.set));
  const ordered = [
    ...shuffled(all.filter((t) => inSets(t) && !avoided(t))),
    ...shuffled(all.filter((t) => inSets(t) && avoided(t))),
    ...shuffled(all.filter((t) => !inSets(t))),
  ];
  const out: Theme[] = [];
  for (const t of ordered) {
    if (out.length === count) break;
    if (!out.some((o) => same(o, t))) out.push(t);
  }
  return out;
}

const SYSTEM = `You invent themes for Ludodare, a guessing game for friends. A theme is drawn at the start of a match; each player then picks something that fits it for someone else, who has to discover it with yes/no questions. That "character" can be a single character or famous person, or a set of them taken as one: a duo, a band, a family, a team, a species (like Pikmin or Minions).
A good theme is short, simple and broad: dozens of widely known answers fit it, from film, TV, animation, anime, games, comics, books, myths, music, sport or history. It is about something people know or can see, not trivia nobody remembers (like real names). One idea per theme: never join two different groups with "and" or "or" (not "Angels or demons", "Butlers and maids", "Kings and queens"); each side has plenty of answers on its own, so pick one. Joining near-synonyms ("Zombies and undead") or a pair that is one answer ("Hero and sidekick") is fine. Nothing sexual, hateful or about real tragedies.
Every theme belongs to one theme set; the user names the sets it may come from.
Answer with one theme in English, Brazilian Portuguese and Japanese: the same idea, written the way a native speaker would say it, each at most 40 characters, sentence case, no final punctuation. Also give the key of its set.`;

let client: Anthropic | null = null;

/** One fresh theme from Claude, from one of `sets`, or null on any problem (the caller falls back to the bank). */
async function drawWithAI(
  avoid: Localized[],
  known: Theme[],
  sets: readonly ThemeSet[],
): Promise<Theme | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ maxRetries: 0, timeout: 6000 });
  const allowed = THEME_SETS.filter((s) => sets.includes(s.key));
  const fitting = known.filter((t) => t.set && sets.includes(t.set));
  const examples = [...(fitting.length ? fitting : known)]
    .sort(() => Math.random() - 0.5)
    .slice(0, 30);
  const user = [
    "Theme sets it may come from:",
    ...allowed.map((s) => `- ${s.key}: ${s.about}`),
    "\nExamples of the style:",
    ...examples.map((t) => `- ${t.en}`),
    avoid.length
      ? `\nDo not repeat these: ${avoid.map((t) => t.en).join("; ")}`
      : "",
    "\nInvent a new one that is not in the examples.",
  ].join("\n");
  const schema = z.object({
    en: z.string(),
    pt: z.string(),
    ja: z.string(),
    set: z.enum(allowed.map((s) => s.key) as [ThemeSet, ...ThemeSet[]]),
  });
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      messages: [{ role: "user", content: user }],
    });
    const t = response.parsed_output;
    if (response.stop_reason === "refusal" || !t) return null;
    const ok = [t.en, t.pt, t.ja].every(
      (v) => v.trim().length > 0 && v.trim().length <= 40,
    );
    if (!ok || !sets.includes(t.set)) return null;
    if ([...avoid, ...known].some((a) => same(a, t))) return null;
    return { en: t.en.trim(), pt: t.pt.trim(), ja: t.ja.trim(), set: t.set };
  } catch (e) {
    console.warn(
      "[themes] AI draw failed, using the bank:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * Draws themes from the store's list, read at most every ten minutes per
 * server (never once per match). Until the first read, or if the store
 * fails, the bundled list is used.
 */
export function themes(store: ThemeStore): ThemeSource {
  let cached: Theme[] | null = null;
  let readAt = 0;
  let reading: Promise<Theme[]> | null = null;

  const current = () => (cached?.length ? cached : themeBank());
  const refresh = (): Promise<Theme[]> => {
    if (cached && Date.now() - readAt < LIST_TTL)
      return Promise.resolve(cached);
    reading ??= store
      .list()
      .then((list) => {
        if (list.length >= 3) cached = list;
        readAt = Date.now();
        return current();
      })
      .catch((e: unknown) => {
        console.warn(
          "[themes] could not read the list, using the bundled one:",
          e instanceof Error ? e.message : e,
        );
        readAt = Date.now();
        return current();
      })
      .finally(() => {
        reading = null;
      });
    return reading;
  };

  return {
    drawFromBank: (count, sets) => {
      void refresh();
      return pickFrom(current(), [], count, sets);
    },
    async draw(avoid, count, sets = THEME_SET_KEYS) {
      const list = await refresh();
      const picked = pickFrom(list, avoid, count, sets);
      // Half of the votes offer one AI theme (when a key is set), so the list's best ones still show up.
      if (count > 0 && Math.random() < 0.5) {
        const others = picked.slice(0, count - 1);
        const fresh = await drawWithAI([...avoid, ...others], list, sets);
        if (fresh) {
          cached = [...current(), fresh];
          background(() => store.add(fresh));
          return shuffled([...others, fresh]);
        }
      }
      return picked;
    },
  };
}
