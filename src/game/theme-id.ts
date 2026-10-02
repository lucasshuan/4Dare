import type { Localized } from "./types";

/** Stable key of a theme, from its English text: "Famous duos" -> "famous-duos". Same idea, same key. */
export function themeId(theme: Localized): string {
  return theme.en
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
