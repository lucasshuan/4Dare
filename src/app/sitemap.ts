import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/paths";
import { routing } from "@/i18n/routing";
import {
  CHARACTERS,
  GAME_LIST,
  GAMES,
  IMPOSTOR,
  LINEUP,
  NEWS,
  PRIVACY,
  ROOMS,
  TERMS,
  WHO_AM_I,
  WORKSHOP,
} from "@/lib/routes";
import { HREFLANG, SITE_URL } from "@/server/seo";

/** The pages worth finding in a search: the games hub, each game, the game and room lists, in every language. */
const PAGES = [
  { path: GAMES, priority: 1 },
  { path: WHO_AM_I, priority: 0.9 },
  { path: IMPOSTOR, priority: 0.9 },
  { path: LINEUP, priority: 0.9 },
  { path: GAME_LIST, priority: 0.7 },
  { path: ROOMS, priority: 0.6 },
  { path: CHARACTERS, priority: 0.5 },
  { path: WORKSHOP, priority: 0.5 },
  { path: NEWS, priority: 0.4 },
  { path: PRIVACY, priority: 0.2 },
  { path: TERMS, priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ path, priority }) =>
    routing.locales.map((lang) => ({
      url: `${SITE_URL}${localePath(lang, path)}`,
      changeFrequency: "weekly" as const,
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [
            HREFLANG[l],
            `${SITE_URL}${localePath(l, path)}`,
          ]),
        ),
      },
    })),
  );
}
