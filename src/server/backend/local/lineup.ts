import "server-only";
import { DECK_PER_TASTE, DECK_TOP, deckOf } from "@/game/lineup/deal";
import { tastesByRule } from "@/game/tastes";
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
      return deckOf(
        LOCAL_CHARACTERS.flatMap((c) => {
          const tastes = tastesByRule(c.origin, c.category);
          return c.imageUrl && tastes?.length && c.names[lang]
            ? [{ id: c.id, tastes, popularity: c.popularity[lang] ?? 0 }]
            : [];
        }).sort((a, b) => b.popularity - a.popularity),
        DECK_TOP,
        DECK_PER_TASTE,
      );
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
