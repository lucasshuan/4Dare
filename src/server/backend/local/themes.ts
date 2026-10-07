import "server-only";
import { GAME_KEYS } from "@/game/games";
import { themeId } from "@/game/theme-id";
import type { ThemeStore } from "../types";
import { LOCAL_THEMES } from "./fixtures";

/** Local mode: the fixture themes, four per set, for every game; no starters, so no gostos. */
export function localThemes(): ThemeStore {
  return {
    async list() {
      return LOCAL_THEMES.map((t) => ({
        ...t,
        id: themeId(t),
        games: [...GAME_KEYS],
        gostos: [],
      }));
    },
  };
}
