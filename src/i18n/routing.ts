import { defineRouting } from "next-intl/routing";
import { LANGS } from "@/game/types";

export const routing = defineRouting({
  locales: LANGS,
  defaultLocale: "en",
  localePrefix: "always",
  // The pages declare their alternates (translated addresses included) in
  // their metadata and the sitemap; next-intl's Link header would list the
  // untranslated ones.
  alternateLinks: false,
});
