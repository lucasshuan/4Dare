import { defineRouting } from "next-intl/routing";
import { LANGS } from "@/game/types";

export const routing = defineRouting({
  locales: LANGS,
  defaultLocale: "en",
  localePrefix: "always",
});
