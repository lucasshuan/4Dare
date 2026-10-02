import "server-only";
import { themeId } from "@/game/theme-id";
import type { ThemeSet } from "@/game/theme-sets";
import type { Theme } from "@/game/types";
import type { ThemeStore } from "../types";
import { serviceClient } from "./clients";

/** Supabase: the themes table (see supabase/migrations/0003_themes.sql and 0009_theme_sets.sql). */
export function supabaseThemes(): ThemeStore {
  const table = () => serviceClient().from("themes");
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
    async add({ set, ...theme }) {
      const { error } = await table().upsert(
        { id: themeId(theme), ...theme, theme_set: set, source: "ai" },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
  };
}
