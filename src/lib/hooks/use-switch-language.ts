"use client";

import type { Lang } from "@/game/types";
import { getPathname, usePathname } from "@/i18n/navigation";

/**
 * Moves to the same page in another language. A full load, not a client
 * navigation: the whole app (its <html> included) lives under the locale, and
 * re-rendering it on the client trips React over the theme script.
 */
export function useSwitchLanguage() {
  const pathname = usePathname();
  return (lang: Lang) =>
    window.location.assign(
      getPathname({ href: pathname, locale: lang }) + window.location.search,
    );
}
