import "server-only";
import { themeId } from "@/game/theme-id";
import type { Theme } from "@/game/types";
import type { ThemeStore } from "../types";
import { readJson, writeJson } from "./disk";
import { LOCAL_THEMES } from "./fixtures";

const AI_FILE = "themes-ai.json";

/** Local mode: the fixture themes plus the AI's themes in .data/themes-ai.json. */
export function localThemes(): ThemeStore {
  return {
    async list() {
      return [...LOCAL_THEMES, ...readJson<Theme[]>(AI_FILE, [])];
    },
    async add(theme) {
      const saved = readJson<Theme[]>(AI_FILE, []);
      const known = new Set([...LOCAL_THEMES, ...saved].map(themeId));
      if (known.has(themeId(theme))) return;
      writeJson(AI_FILE, [...saved, theme]);
    },
  };
}
