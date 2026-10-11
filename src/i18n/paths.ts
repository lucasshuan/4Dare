import type { Lang } from "@/game/types";

// The public pages' addresses read in the visitor's language: "/pt/quem-sou-eu"
// is the who-am-i page. The app's routes and code keep the English name; the
// proxy rewrites a translated address to its route and sends the English one
// (or another language's) to the right translation. Only the first segment
// is translated; a language without an entry keeps the English one.

const TRANSLATED: Record<string, Partial<Record<Lang, string>>> = {
  "who-am-i": { pt: "quem-sou-eu", es: "quien-soy" },
  "build-the-team": { pt: "monte-a-equipe", es: "arma-el-equipo" },
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
