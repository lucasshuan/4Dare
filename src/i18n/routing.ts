import { defineRouting } from "next-intl/routing";
import { LANGS } from "@/game/types";

/** Remembers the language a visitor picked, so the unprefixed English pages don't send them back to their browser's. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

// English lives at the root ("/", "/who-am-i") and the other languages under
// their prefix ("/pt/quem-sou-eu"): search engines take the site's name and
// icon from "/", so it has to be a page rather than a redirect. A visitor
// whose browser (or earlier pick) asks for another language is still sent
// there from an unprefixed address.
export const routing = defineRouting({
  locales: LANGS,
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeCookie: { name: LOCALE_COOKIE },
  // The pages declare their alternates (translated addresses included) in
  // their metadata and the sitemap; next-intl's Link header would list the
  // untranslated ones.
  alternateLinks: false,
});
