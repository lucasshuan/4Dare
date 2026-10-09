"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { GameKey } from "@/game/games";
import { letsIn, type Taste } from "@/game/tastes";
import { THEME_OPTIONS } from "@/game/types";
import type { ThemeCatalogEntry } from "@/server/contract";

/** Every theme, as the room setup shows it: undefined until it arrives (or while not `enabled`). */
export function useThemeCatalog(
  enabled = true,
): ThemeCatalogEntry[] | undefined {
  const { data } = useQuery({
    enabled,
    queryKey: ["theme-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/themes/catalog");
      if (!res.ok) throw new Error(`theme catalog: ${res.status}`);
      return ((await res.json()) as { themes: ThemeCatalogEntry[] }).themes;
    },
    staleTime: 10 * 60_000,
  });
  return data;
}

/** Below this many themes the room's votes start to repeat: the setup says so. */
export const FEW_THEMES = 12;

/** How many themes a room lets in, and out of how many its game has (null for What for?, which has none). */
export function useThemeCount(room: {
  game: GameKey;
  offTastes: readonly Taste[];
  offThemes: readonly string[];
}) {
  const catalog = useThemeCatalog(room.game !== "lineup");
  const { game, offTastes, offThemes } = room;
  return useMemo(() => {
    if (!catalog || game === "lineup") return null;
    const ofGame = catalog.filter((t) => t.games.includes(game));
    const on = ofGame.filter((t) =>
      letsIn(t, { game, offTastes, offThemes }),
    ).length;
    return {
      on,
      total: ofGame.length,
      /** A vote needs this many to offer its options. */
      tooFew: on < THEME_OPTIONS,
      few: on < FEW_THEMES,
    };
  }, [catalog, game, offTastes, offThemes]);
}
