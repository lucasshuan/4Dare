import type { Taste } from "@/game/tastes";
import { THEME_SETS } from "@/game/theme-sets";
import type { ThemeCatalogEntry } from "@/server/contract";

/** Keep sets with matching tastes; missing catalog evidence never hides a set. */
export function setsForTastes(
  tastes: readonly Taste[],
  catalog: readonly Pick<ThemeCatalogEntry, "set" | "tastes">[] | undefined,
) {
  const sets = THEME_SETS.filter((set) => {
    if (!tastes.length) return true;
    const known = (catalog ?? [])
      .filter((theme) => theme.set === set.key)
      .flatMap((theme) => theme.tastes.flatMap((starter) => starter ?? []));
    return !known.length || known.some((taste) => tastes.includes(taste));
  });
  // Existing examples may not cover a taste yet; a new theme still needs a set.
  return sets.length ? sets : THEME_SETS;
}
