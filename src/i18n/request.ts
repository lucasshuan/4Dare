import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// One JSON file per namespace and language: messages/<locale>/<namespace>.json
export const NAMESPACES = [
  "common",
  "home",
  "profile",
  "lobby",
  "game",
  "result",
  "room",
  "turn",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [
      ns,
      (await import(`../../messages/${locale}/${ns}.json`)).default,
    ]),
  );
  return { locale, messages: Object.fromEntries(entries) };
});
