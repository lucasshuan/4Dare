import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Localized } from "@/game/types";
import bankFile from "../../data/themes.json";
import type { ThemeSource } from "./backend/types";

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

function pickFromBank(avoid: Localized[]): Localized {
  const all = themeBank();
  const fresh = all.filter((t) => !avoid.some((a) => same(a, t)));
  const pool = fresh.length ? fresh : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

const ThemeSchema = z.object({
  en: z.string(),
  pt: z.string(),
  ja: z.string(),
});

const SYSTEM = `You invent themes for Dare, a guessing game for friends. A theme is drawn at the start of a match; each player then picks a character or famous person that fits it for someone else, who has to discover it with yes/no questions.
A good theme is short, simple and broad: dozens of widely known characters or people fit it, from film, TV, animation, anime, games, comics, books, myths, music, sport or history. Nothing sexual, hateful or about real tragedies.
Answer with one theme in English, Brazilian Portuguese and Japanese: the same idea, written the way a native speaker would say it, each at most 40 characters, sentence case, no final punctuation.`;

let client: Anthropic | null = null;

/** One fresh theme from Claude, or null on any problem (the caller falls back to the bank). */
async function drawWithAI(avoid: Localized[]): Promise<Localized | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ maxRetries: 0, timeout: 6000 });
  const examples = [...themeBank()]
    .sort(() => Math.random() - 0.5)
    .slice(0, 30);
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
    if (!ok || avoid.some((a) => same(a, t))) return null;
    return { en: t.en.trim(), pt: t.pt.trim(), ja: t.ja.trim() };
  } catch (e) {
    console.warn(
      "[themes] AI draw failed, using the bank:",
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

export function themes(): ThemeSource {
  return {
    drawFromBank: () => pickFromBank([]),
    async draw(avoid) {
      // Half of the matches get an AI theme (when a key is set), so the bank's best ones still show up.
      if (Math.random() < 0.5) {
        const fresh = await drawWithAI(avoid);
        if (fresh) return fresh;
      }
      return pickFromBank(avoid);
    },
  };
}
