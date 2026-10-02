import "server-only";
import { themeId } from "@/game/theme-id";
import type { Localized } from "@/game/types";
import type { ThemeStore } from "../types";
import { serviceClient } from "./clients";

/** Supabase: the themes table (see supabase/migrations/0003_themes.sql). */
export function supabaseThemes(): ThemeStore {
  const table = () => serviceClient().from("themes");
  return {
    async list() {
      const { data, error } = await table()
        .select("en, pt, ja")
        .eq("active", true)
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Localized[];
    },
    async add(theme) {
      const { error } = await table().upsert(
        { id: themeId(theme), ...theme, source: "ai" },
        { onConflict: "id", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
  };
}
