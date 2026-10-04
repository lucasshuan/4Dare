// Lab fixtures for the pick table: the character index the card searches
// (so typing works without the library), the theme's hand (`queries`), and
// the viewer's draft for the timeout (the default one: a new name, "Ms. Marvel").

import { type HandCard, handKey } from "@/features/pick/draft-api";
import { toSearchItem } from "@/game/character-search";
import { themeId } from "@/game/theme-id";
import type { Character, Lang } from "@/game/types";
import { labCharacter, labThemes, type SceneFixtures } from "../fixtures";
import type { LabParams } from "../params";

/** The searchable characters: enough to type "Iron" (two rows), "Spi" (one), "Zq" (none). */
const LIBRARY: [string, string | null][] = [
  ["Spider-Man", "Marvel"],
  ["Iron Man", "Marvel"],
  ["Wonder Woman", "DC"],
  ["Hulk", "Marvel"],
  ["Black Panther", "Marvel"],
  ["Storm", "X-Men"],
  ["Batman", "DC"],
  ["Superman", "DC"],
  ["Iron Fist", "Marvel"],
  ["Captain Marvel", "Marvel"],
  ["Shrek", "DreamWorks"],
  ["Chapolin Colorado", null],
];

/** Likes and picks of the hand's cards, in the route's order (best first). */
const HAND_STATS: [likes: number, picks: number][] = [
  [42, 51],
  [37, 40],
  [31, 33],
  [27, 30],
  [19, 22],
  [12, 15],
  [0, 3],
  [0, 0],
];

function library(lang: Lang): Character[] {
  return LIBRARY.map(([name, origin], i) =>
    labCharacter(`lab-l${i + 1}`, name, origin, i, lang),
  );
}

export function scenario(params: LabParams): SceneFixtures {
  const characters = library(params.lang);
  const hand: HandCard[] = characters
    .slice(0, HAND_STATS.length)
    .map((c, i) => ({
      id: c.id,
      lang: c.lang,
      name: c.name,
      origin: c.origin,
      imageUrl: c.imageUrl,
      likes: HAND_STATS[i][0],
      picks: HAND_STATS[i][1],
    }));
  return {
    queries: [
      // the key of useCharacterIndex
      {
        key: ["character-index", params.lang],
        data: characters.map((c) => toSearchItem(c)),
      },
      // whichever of the three themes wins (a tie may pick another)
      ...labThemes(params.set).map((theme) => ({
        key: handKey(themeId(theme), params.lang),
        data: hand,
      })),
    ],
  };
}
