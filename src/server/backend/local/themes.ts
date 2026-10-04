import "server-only";
import type { ThemeStore } from "../types";
import { LOCAL_THEMES } from "./fixtures";

/** Local mode: the fixture themes, three per set. */
export function localThemes(): ThemeStore {
  return {
    async list() {
      return LOCAL_THEMES;
    },
  };
}
