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
  "meta",
] as const;

// `locale` is set when a caller names it (share images, metadata). Then the request is
// never read: even touching `requestLocale` reads headers, which fails at build time.
export default getRequestConfig(async (params) => {
  const requested = params.locale ?? (await params.requestLocale);
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
