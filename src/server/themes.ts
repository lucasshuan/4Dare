import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Localized } from "@/game/types";
import bankFile from "../../data/themes.json";
import type { ThemeSource, ThemeStore } from "./backend/types";
import { background } from "./background";

const FALLBACK: Localized[] = [
  { en: "Villains", pt: "Vilões", ja: "悪役" },
  { en: "Robots", pt: "Robôs", ja: "ロボット" },
  {
    en: "Rich characters",
    pt: "Personagens ricos",
    ja: "お金持ちのキャラクター",
  },
];

/** data/themes.json, the built-in theme list (bundled, so it ships with the server). */
export function themeBank(): Localized[] {
  const list = bankFile as Localized[];
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

/** `count` different themes, avoiding `avoid` while the list allows it. */
function pickFrom(
  all: Localized[],
  avoid: Localized[],
  count: number,
): Localized[] {
  const avoided = (t: Localized) => avoid.some((a) => same(a, t));
  const ordered = [
    ...shuffled(all.filter((t) => !avoided(t))),
    ...shuffled(all.filter(avoided)),
  ];
  const out: Localized[] = [];
  for (const t of ordered) {
    if (out.length === count) break;
    if (!out.some((o) => same(o, t))) out.push(t);
  }
  return out;
}

const ThemeSchema = z.object({
  en: z.string(),
  pt: z.string(),
  ja: z.string(),
});

const SYSTEM = `You invent themes for Dare, a guessing game for friends. A theme is drawn at the start of a match; each player then picks something that fits it for someone else, who has to discover it with yes/no questions. That "character" can be a single character or famous person, or a set of them taken as one: a duo, a band, a family, a team, a species (like Pikmin or Minions).
A good theme is short, simple and broad: dozens of widely known answers fit it, from film, TV, animation, anime, games, comics, books, myths, music, sport or history. It is about something people know or can see, not trivia nobody remembers (like real names). One idea per theme: never join two different groups with "and" or "or" (not "Angels or demons", "Butlers and maids", "Kings and queens"); each side has plenty of answers on its own, so pick one. Joining near-synonyms ("Zombies and undead") or a pair that is one answer ("Hero and sidekick") is fine. Nothing sexual, hateful or about real tragedies.
Answer with one theme in English, Brazilian Portuguese and Japanese: the same idea, written the way a native speaker would say it, each at most 40 characters, sentence case, no final punctuation.`;

let client: Anthropic | null = null;

/** One fresh theme from Claude, or null on any problem (the caller falls back to the bank). */
async function drawWithAI(
  avoid: Localized[],
  known: Localized[],
): Promise<Localized | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ maxRetries: 0, timeout: 6000 });
  const examples = [...known].sort(() => Math.random() - 0.5).slice(0, 30);
  const user = [
    "Examples of the style:",
    ...examples.map((t) => `- ${t.en}`),
    avoid.length
      ? `\nDo not repeat these: ${avoid.map((t) => t.en).join("; ")}`
      : "",
    "\nInvent a new one that is not in the examples.",
  ].join("\n");
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      system: SYSTEM,
      output_config: { effort: "low", format: zodOutputFormat(ThemeSchema) },
      messages: [{ role: "user", content: user }],
    });
    const t = response.parsed_output;
    if (response.stop_reason === "refusal" || !t) return null;
    const ok = [t.en, t.pt, t.ja].every(
      (v) => v.trim().length > 0 && v.trim().length <= 40,
    );
    if (!ok || [...avoid, ...known].some((a) => same(a, t))) return null;
    return { en: t.en.trim(), pt: t.pt.trim(), ja: t.ja.trim() };
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
  let cached: Localized[] | null = null;
  let readAt = 0;
  let reading: Promise<Localized[]> | null = null;

  const current = () => (cached?.length ? cached : themeBank());
  const refresh = (): Promise<Localized[]> => {
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
    drawFromBank: (count) => {
      void refresh();
      return pickFrom(current(), [], count);
    },
    async draw(avoid, count) {
      const list = await refresh();
      const picked = pickFrom(list, avoid, count);
      // Half of the votes offer one AI theme (when a key is set), so the list's best ones still show up.
      if (count > 0 && Math.random() < 0.5) {
        const others = picked.slice(0, count - 1);
        const fresh = await drawWithAI([...avoid, ...others], list);
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
