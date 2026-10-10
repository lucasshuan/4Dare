import "server-only";
import { unstable_cache } from "next/cache";
import type { GameKey } from "@/game/games";
import type { Lang } from "@/game/types";
import { getBackend } from "./backend";
import { catalog } from "./catalog";
import { podium } from "./community";
import type { GameFactsData } from "./community-contract";

/** How long a game page keeps its facts, in seconds (the pages' `revalidate` says the same). */
const FACTS_TTL = 600;

const read = unstable_cache(
  async (game: GameKey, lang: Lang): Promise<GameFactsData> => {
    const { themes, impostor, lineup } = getBackend();
    const [list, questions, missions, library, board] = await Promise.all([
      themes.catalog(),
      impostor.list(),
      lineup.missions(),
      catalog(lang),
      podium(game, lang),
    ]);
    return {
      themes: list.filter((t) => t.games.includes(game)).length,
      questions: questions.length,
      missions: missions.length,
      characters: library.rows.length,
      podium: board,
    };
  },
  ["game-facts"],
  { revalidate: FACTS_TTL },
);

/**
 * What a game's page counts and shows, the same for every reader, so the
 * server keeps it ten minutes instead of every visit asking the database.
 * Null when the database fails: the page shows its placeholders.
 */
export async function gameFacts(
  game: GameKey,
  lang: Lang,
): Promise<GameFactsData | null> {
  try {
    return await read(game, lang);
  } catch {
    return null;
  }
}
