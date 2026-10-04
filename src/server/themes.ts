import "server-only";
import { THEME_SET_KEYS, type ThemeSet } from "@/game/theme-sets";
import type { Localized, Theme } from "@/game/types";
import bankFile from "../../data/themes.json";
import type { ThemeSource, ThemeStore } from "./backend/types";

const FALLBACK: Theme[] = [
  { en: "Villains", pt: "Vilões", ja: "悪役", set: "heroes" },
  { en: "Robots", pt: "Robôs", ja: "ロボット", set: "scifi" },
  {
    en: "Rich characters",
    pt: "Personagens ricos",
    ja: "お金持ちのキャラクター",
    set: "quirks",
  },
];

/** data/themes.json, the built-in theme list (bundled, so it ships with the server). */
export function themeBank(): Theme[] {
  const list = bankFile as Theme[];
  return list.length >= 3 ? list : FALLBACK;
}

const same = (a: Localized, b: Localized) =>
  a.en.toLowerCase() === b.en.toLowerCase();

/** How long a server keeps the theme list before reading it again. */
const LIST_TTL = 10 * 60_000;

const shuffled = <T>(items: T[]) =>
  items
    .map((item) => ({ item, key: Math.random() }))
    .sort((a, b) => a.key - b.key)
    .map(({ item }) => item);

/**
 * `count` different themes from `sets` (every set when left out), avoiding
 * `avoid`. When the sets run short, the avoided ones come back first, then
 * themes from the other sets.
 */
function pickFrom(
  all: Theme[],
  avoid: Localized[],
  count: number,
  sets?: readonly ThemeSet[],
): Theme[] {
  const avoided = (t: Theme) => avoid.some((a) => same(a, t));
  const inSets = (t: Theme) => !sets || (!!t.set && sets.includes(t.set));
  const ordered = [
    ...shuffled(all.filter((t) => inSets(t) && !avoided(t))),
    ...shuffled(all.filter((t) => inSets(t) && avoided(t))),
    ...shuffled(all.filter((t) => !inSets(t))),
  ];
  const out: Theme[] = [];
  for (const t of ordered) {
    if (out.length === count) break;
    if (!out.some((o) => same(o, t))) out.push(t);
  }
  return out;
}

/**
 * Draws themes from the store's list, read at most every ten minutes per
 * server (never once per match). Until the first read, or if the store
 * fails, the bundled list is used.
 */
export function themes(store: ThemeStore): ThemeSource {
  let cached: Theme[] | null = null;
  let readAt = 0;
  let reading: Promise<Theme[]> | null = null;

  const current = () => (cached?.length ? cached : themeBank());
  const refresh = (): Promise<Theme[]> => {
    if (cached && Date.now() - readAt < LIST_TTL)
      return Promise.resolve(cached);
    reading ??= store
      .list()
      .then((list) => {
        if (list.length >= 3) cached = list;
        readAt = Date.now();
        return current();
      })
      .catch((e: unknown) => {
        console.warn(
          "[themes] could not read the list, using the bundled one:",
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

  return {
    drawFromBank: (count, sets) => {
      void refresh();
      return pickFrom(current(), [], count, sets);
    },
    async draw(avoid, count, sets = THEME_SET_KEYS) {
      return pickFrom(await refresh(), avoid, count, sets);
    },
  };
}
