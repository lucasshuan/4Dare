import "server-only";
import { themeId } from "@/game/theme-id";
import type { Theme } from "@/game/types";
import { themeBank } from "../../themes";
import type { ThemeStore } from "../types";
import { readJson, writeJson } from "./disk";

const AI_FILE = "themes-ai.json";

/** Local mode: the bundled list plus the AI's themes in .data/themes-ai.json. */
export function localThemes(): ThemeStore {
  return {
    async list() {
      return [...themeBank(), ...readJson<Theme[]>(AI_FILE, [])];
    },
    async add(theme) {
      const saved = readJson<Theme[]>(AI_FILE, []);
      const known = new Set([...themeBank(), ...saved].map(themeId));
      if (known.has(themeId(theme))) return;
      writeJson(AI_FILE, [...saved, theme]);
    },
  };
}
