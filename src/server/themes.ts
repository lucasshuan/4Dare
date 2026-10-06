import "server-only";
import { THEME_SET_KEYS, type ThemeSet } from "@/game/theme-sets";
import { type Localized, THEME_OPTIONS, type Theme } from "@/game/types";
import type { ThemeSource, ThemeStore } from "./backend/types";

/** Only while the store's list never arrived (a server's first moments, or the store down). */
const FALLBACK: Theme[] = [
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
];

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
 * Draws themes from the store's list, read when the server starts and then at
 * most every ten minutes (never once per match). Until the first read lands,
 * or while the store fails, a vote's worth of fallback themes stands in.
 */
export function themes(store: ThemeStore): ThemeSource {
  let cached: Theme[] | null = null;
  let readAt = 0;
  let reading: Promise<Theme[]> | null = null;

  const current = () => (cached?.length ? cached : FALLBACK);
  const refresh = (): Promise<Theme[]> => {
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
    drawFromBank: (count, sets) => {
      void refresh();
      return pickFrom(current(), [], count, sets);
    },
    async draw(avoid, count, sets = THEME_SET_KEYS) {
      return pickFrom(await refresh(), avoid, count, sets);
    },
  };
}
