import type { Lang } from "@/game/types";
import { routing } from "./routing";

// The public pages' addresses read in the visitor's language: "/pt/quem-sou-eu"
// is the who-am-i page; English, at the root, keeps the route's own name
// ("/who-am-i"). The app's routes and code keep the English name; the proxy
// rewrites a translated address to its route and sends the English one (or
// another language's) to the right translation. Only the first segment is
// translated; a language without an entry keeps the English one.

const TRANSLATED: Record<string, Partial<Record<Lang, string>>> = {
  "who-am-i": { pt: "quem-sou-eu", es: "quien-soy" },
  lineup: { pt: "escalacao", es: "alineacion" },
  games: { pt: "jogos", es: "juegos" },
  rooms: { pt: "salas", es: "salas" },
  characters: { pt: "personagens", es: "personajes" },
  workshop: { pt: "oficina", es: "taller" },
  news: { pt: "novidades", es: "novedades" },
  players: { pt: "jogadores", es: "jugadores" },
  contributions: { pt: "contribuicoes", es: "contribuciones" },
  privacy: { pt: "privacidade", es: "privacidad" },
  terms: { pt: "termos", es: "terminos" },
};

/** Any language's word for a page, to the route's own. */
const ROUTE_OF = new Map(
  Object.entries(TRANSLATED).flatMap(([route, words]) =>
    Object.values(words).map((word) => [word, route] as const),
  ),
);

/** Splits "/who-am-i/x?y" into "who-am-i" and "/x?y". */
const split = (path: string) => {
  const m = /^\/([^/?#]*)(.*)$/.exec(path);
  return m ? { first: m[1], rest: m[2] } : null;
};

/** An app path ("/who-am-i?game=x") as `lang` reads it ("/quem-sou-eu?game=x"). */
export function localizePath(lang: Lang, path: string): string {
  const parts = split(path);
  const word = parts && TRANSLATED[parts.first]?.[lang];
  return word ? `/${word}${parts.rest}` : path;
}

/** A path in any language back to the app's route ("/salas" -> "/rooms"). */
export function routePath(path: string): string {
  const parts = split(path);
  const route = parts && ROUTE_OF.get(parts.first);
  return route ? `/${route}${parts.rest}` : path;
}

/** The language a translated first word is in ("/quem-sou-eu" is Portuguese), the first one listed when two share it; null for a route's own name. */
export function wordLanguage(path: string): Lang | null {
  const parts = split(path);
  if (!parts) return null;
  for (const words of Object.values(TRANSLATED)) {
    const lang = (Object.keys(words) as Lang[]).find(
      (l) => words[l] === parts.first,
    );
    if (lang) return lang;
  }
  return null;
}

/** An app path's full address in `lang`: English has no prefix ("/who-am-i", "/"), the rest do ("/pt/quem-sou-eu", "/pt"). */
export function localePath(lang: Lang, path: string): string {
  const local = localizePath(lang, path);
  if (lang === routing.defaultLocale) return local;
  return local === "/" ? `/${lang}` : `/${lang}${local}`;
}
