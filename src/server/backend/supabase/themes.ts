import "server-only";
import type { ThemeSet } from "@/game/theme-sets";
import type { Lang, Theme } from "@/game/types";
import type { ThemeStarter, ThemeStore } from "../types";
import { type Db, serviceClient } from "./clients";

/** Supabase: the whoami_themes table (see supabase/migrations/0003_themes.sql and 0009_theme_sets.sql). */
export function supabaseThemes(): ThemeStore {
  const table = () => serviceClient().from("whoami_themes");
  return {
    async list() {
      const { data, error } = await table()
        .select("en, pt, ja, theme_set")
        .eq("active", true)
        .limit(5000);
      if (error) throw error;
      return (data ?? []).map(
        ({ theme_set, ...t }): Theme => ({
          ...t,
          set: theme_set as ThemeSet | null,
        }),
      );
    },
  };
}

/** A whoami_theme_starters row with its character's kind and its theme's set. */
interface StarterRow {
  theme_id: string;
  character_id: string;
  lang: string;
  position: number;
  characters: { kind: ThemeStarter["kind"] } | null;
  themes: { theme_set: string | null; active: boolean } | null;
}

const STARTER_COLUMNS =
  "theme_id, character_id, lang, position, characters(kind), themes:whoami_themes(theme_set, active)";
/** Rows asked for per request; PostgREST may hand out fewer (its "max rows"). */
const PAGE = 1000;
/** As long as the theme list is kept (src/server/themes.ts). */
const STARTERS_TTL = 10 * 60_000;

/**
 * Every active theme's starters (supabase/migrations/0011_theme_starters.sql,
 * per language since 0022), by theme, language then position (unique, so
 * pages never skip or repeat a row), a page at a time until an empty page:
 * the table outgrows one page (about 2200 rows).
 */
export async function readStarters(db: Db): Promise<ThemeStarter[]> {
  const out: ThemeStarter[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await db
      .from("whoami_theme_starters")
      .select(STARTER_COLUMNS)
      .order("theme_id", { ascending: true })
      .order("lang", { ascending: true })
      .order("position", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown as StarterRow[];
    if (rows.length === 0) return out;
    from += rows.length;
    for (const r of rows) {
      if (r.themes && !r.themes.active) continue;
      out.push({
        themeId: r.theme_id,
        set: (r.themes?.theme_set ?? null) as ThemeSet | null,
        characterId: r.character_id,
        lang: r.lang as Lang | "all",
        position: r.position,
        kind: r.characters?.kind ?? null,
      });
    }
  }
}

/**
 * The starters, read at most every ten minutes per server. Requests that
 * arrive during a read share it; a failed read keeps the last list (or none)
 * and the next request tries again, so a starter never breaks a match.
 */
export function supabaseStarters(
  db: () => Db = serviceClient,
  ttl = STARTERS_TTL,
) {
  let cached: { at: number; rows: ThemeStarter[] } | null = null;
  let loading: Promise<ThemeStarter[]> | null = null;
  return (): Promise<ThemeStarter[]> => {
    if (cached && Date.now() - cached.at < ttl)
      return Promise.resolve(cached.rows);
    loading ??= readStarters(db())
      .then((rows) => {
        cached = { at: Date.now(), rows };
        return rows;
      })
      .catch((e: unknown) => {
        console.warn(
          "[starters] could not read whoami_theme_starters:",
          e instanceof Error ? e.message : e,
        );
        return cached?.rows ?? [];
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  };
}
