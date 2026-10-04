import "server-only";
import { BACKEND } from "@/config";
import type { ThemeSet } from "@/game/theme-sets";
import type { Localized } from "@/game/types";
import { fixtureExamples } from "@/server/backend/local";
import { type Db, serviceClient } from "./backend/supabase/clients";

/** A few themes of each set, shown when someone hovers the set while setting up a room. */
export type ThemeExamples = Partial<Record<ThemeSet, Localized[]>>;

interface ExampleRow extends Localized {
  theme_set: string;
}

const TTL = 60 * 60_000;
const PER_SET = 3;

/** Rows in example order become lists per set. */
export function groupExamples(rows: ExampleRow[]): ThemeExamples {
  const out: ThemeExamples = {};
  for (const { theme_set, en, pt, ja } of rows) {
    const list = out[theme_set as ThemeSet] ?? [];
    if (list.length < PER_SET) list.push({ en, pt, ja });
    out[theme_set as ThemeSet] = list;
  }
  return out;
}

/** The examples marked in the whoami_themes table (`example`, 1 to 3 per set). */
async function readExamples(db: Db): Promise<ThemeExamples> {
  const { data, error } = await db
    .from("whoami_themes")
    .select("en, pt, ja, theme_set")
    .eq("active", true)
    .not("example", "is", null)
    .order("theme_set")
    .order("example");
  if (error) throw error;
  return groupExamples((data ?? []) as ExampleRow[]);
}

/**
 * Read at most once an hour per server; a failed read keeps the last answer
 * (or fails if there is none, and the next request tries again). Local mode
 * shows its own fixture themes, three per set.
 */
export function themeExamplesSource(db: () => Db = serviceClient, ttl = TTL) {
  let cached: { at: number; examples: ThemeExamples } | null = null;
  let loading: Promise<ThemeExamples> | null = null;
  return (): Promise<ThemeExamples> => {
    if (cached && Date.now() - cached.at < ttl)
      return Promise.resolve(cached.examples);
    loading ??= readExamples(db())
      .then((examples) => {
        cached = { at: Date.now(), examples };
        return examples;
      })
      .catch((error: unknown) => {
        if (cached) return cached.examples;
        throw error;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  };
}

const fromDatabase = themeExamplesSource();

export async function themeExamples(): Promise<ThemeExamples> {
  return BACKEND === "supabase" ? fromDatabase() : fixtureExamples();
}
