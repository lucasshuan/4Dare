import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// One JSON file per namespace and language. The shared ones, at
// messages/<locale>/<namespace>.json:
const SHARED = [
  "common",
  "home",
  "profile",
  "settings",
  "lobby",
  "room",
  "chat",
  "meta",
  "nav",
  "howTo",
  "library",
] as const;

// Each game's own, everything its match shows, at messages/<locale>/games/<namespace>.json:
export const GAME_NAMESPACES = ["whoAmI", "impostor", "lineup"] as const;

export const NAMESPACES = [...SHARED, ...GAME_NAMESPACES] as const;
type Namespace = (typeof NAMESPACES)[number];

const isGame = (ns: Namespace) =>
  (GAME_NAMESPACES as readonly Namespace[]).includes(ns);

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
      (isGame(ns)
        ? await import(`../../messages/${locale}/games/${ns}.json`)
        : await import(`../../messages/${locale}/${ns}.json`)
      ).default,
    ]),
  );
  return { locale, messages: Object.fromEntries(entries) };
});
