import "server-only";
import { gostosByRule } from "@/game/gostos";
import { POOL_MAX, type PoolCard } from "@/game/lineup/deal";
import type { LineupStore } from "../types";
import { LOCAL_CHARACTERS } from "./fixtures";
import { LOCAL_EXTRAS, LOCAL_MISSIONS } from "./lineup-bank";

/** The banks' first lots and the fixture library as a deck; nothing is counted, so nothing is priciest. */
export function localLineup(): LineupStore {
  return {
    async missions() {
      return LOCAL_MISSIONS;
    },
    async extras() {
      return LOCAL_EXTRAS;
    },
    async pool(lang) {
      return LOCAL_CHARACTERS.flatMap((c) => {
        const gostos = gostosByRule(c.origin, c.category);
        return c.imageUrl && gostos?.length && c.names[lang]
          ? [{ id: c.id, gostos, popularity: c.popularity[lang] ?? 0 }]
          : [];
      })
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, POOL_MAX)
        .map(({ id, gostos }, i): PoolCard => ({ id, gostos, rank: i + 1 }));
    },
    async count() {},
    async blocked() {
      return new Set<string>();
    },
    async priciest() {
      return [];
    },
  };
}
