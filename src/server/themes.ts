import "server-only";
import { GAME_KEYS } from "@/game/games";
import { letsIn, type ThemeFilter } from "@/game/tastes";
import { themeId } from "@/game/theme-id";
import { type Localized, THEME_OPTIONS, type Theme } from "@/game/types";
import type { CatalogTheme, ThemeSource, ThemeStore } from "./backend/types";

const fallback = (t: Theme): CatalogTheme => ({
  ...t,
  id: themeId(t),
  games: [...GAME_KEYS],
  tastes: [],
});

/** Only while the store's list never arrived (a server's first moments, or the store down). */
const FALLBACK: CatalogTheme[] = [
  { en: "Villains", es: "Villanos", ja: "悪役", pt: "Vilões", set: "heroes" },
  { en: "Robots", es: "Robots", ja: "ロボット", pt: "Robôs", set: "scifi" },
  {
    en: "Rich characters",
    es: "Personajes ricos",
    pt: "Personagens ricos",
    ja: "お金持ちのキャラクター",
    set: "quirks",
  },
  { en: "Pirates", es: "Piratas", ja: "海賊", pt: "Piratas", set: "warriors" },
].map((t) => fallback(t as Theme));

const same = (a: Localized, b: Localized) =>
  a.en.toLowerCase() === b.en.toLowerCase();

/** How long a server keeps the theme list before reading it again. */
const LIST_TTL = 10 * 60_000;

const shuffled = <T>(items: T[]) =>
  items
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

/** What a vote keeps of a theme: its names and set, nothing the list adds. */
const plain = ({ en, es, ja, pt, set }: CatalogTheme): Theme => ({
  en,
  es,
  ja,
  pt,
  set,
});

/**
 * `count` different themes the filter lets in, avoiding `avoid`. When those
 * run short, the avoided ones come back first, then the themes the filter
 * kept out, so a vote always has its options.
 */
function pickFrom(
  all: CatalogTheme[],
  avoid: Localized[],
  count: number,
  filter?: ThemeFilter,
): Theme[] {
  const avoided = (t: Theme) => avoid.some((a) => same(a, t));
  const fits = (t: CatalogTheme) => !filter || letsIn(t, filter);
  const ordered = [
    ...shuffled(all.filter((t) => fits(t) && !avoided(t))),
    ...shuffled(all.filter((t) => fits(t) && avoided(t))),
    ...shuffled(all.filter((t) => !fits(t))),
  ];
  const out: Theme[] = [];
  for (const t of ordered) {
    if (out.length === count) break;
    if (!out.some((o) => same(o, t))) out.push(plain(t));
  }
  return out;
}

/**
 * Draws themes from the store's list, read when the server starts and then at
 * most every ten minutes (never once per match). Until the first read lands,
 * or while the store fails, a vote's worth of fallback themes stands in.
 */
export function themes(store: ThemeStore): ThemeSource {
  let cached: CatalogTheme[] | null = null;
  let readAt = 0;
  let reading: Promise<CatalogTheme[]> | null = null;

  const current = () => (cached?.length ? cached : FALLBACK);
  const refresh = (): Promise<CatalogTheme[]> => {
    if (cached && Date.now() - readAt < LIST_TTL)
      return Promise.resolve(cached);
    reading ??= store
      .list()
      .then((list) => {
        if (list.length >= THEME_OPTIONS) cached = list;
        readAt = Date.now();
        return current();
      })
      .catch((e: unknown) => {
        console.warn(
          "[themes] could not read the list:",
          e instanceof Error ? e.message : e,
        );
        readAt = Date.now();
        return current();
      })
      .finally(() => {
        reading = null;
      });
    return reading;
  };
  // the instant draws (a host's ideas, a round the clock starts) need it in hand
  void refresh();

  return {
    drawFromBank: (count, filter) => {
      void refresh();
      return pickFrom(current(), [], count, filter);
    },
    async draw(avoid, count, filter) {
      return pickFrom(await refresh(), avoid, count, filter);
    },
    catalog: refresh,
  };
}
