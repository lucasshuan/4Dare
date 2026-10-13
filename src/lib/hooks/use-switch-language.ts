"use client";

import type { Lang } from "@/game/types";
import { getPathname, usePathname } from "@/i18n/navigation";
import { LOCALE_COOKIE } from "@/i18n/routing";

/**
 * Moves to the same page in another language. A full load, not a client
 * navigation: the whole app (its <html> included) lives under the locale, and
 * re-rendering it on the client trips React over the theme script. The query
 * and the hash go along, so the page reopens where it was (a tab, a section).
 * The pick is remembered first: English has no prefix, and without it the
 * proxy would send a Portuguese browser right back to /pt.
 */
export function useSwitchLanguage() {
  const pathname = usePathname();
  return (lang: Lang) => {
    // biome-ignore lint/suspicious/noDocumentCookie: the proxy reads this cookie on the full load that follows
    document.cookie = `${LOCALE_COOKIE}=${lang}; path=/; SameSite=Lax`;
    window.location.assign(
      getPathname({ href: pathname, locale: lang }) +
        window.location.search +
        window.location.hash,
    );
  };
}
