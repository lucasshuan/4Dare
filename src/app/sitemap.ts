import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import {
  CHARACTERS,
  GAMES,
  IMPOSTOR,
  NEWS,
  PRIVACY,
  ROOMS,
  TERMS,
  WHAT_FOR,
  WHO_AM_I,
  WORKSHOP,
} from "@/lib/routes";
import { HREFLANG, localePath, SITE_URL } from "@/server/seo";

/** The pages worth finding in a search: the games hub, each game and the room list, in every language. */
const PAGES = [
  { path: GAMES, priority: 1 },
  { path: WHO_AM_I, priority: 0.9 },
  { path: IMPOSTOR, priority: 0.9 },
  { path: WHAT_FOR, priority: 0.9 },
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
