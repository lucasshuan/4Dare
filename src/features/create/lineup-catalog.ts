"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import type { GameKey } from "@/game/games";
import { GOSTOS, type Gosto } from "@/game/gostos";
import { roomMissions } from "@/game/lineup/bank";
import { MIN_POOL } from "@/game/lineup/deal";
import type { Lang } from "@/game/types";
import type { LineupCatalog } from "@/server/contract";

/** What for?'s missions and the reader's deck by gostos: undefined until it arrives (or while not `enabled`). */
export function useLineupCatalog(enabled = true): LineupCatalog | undefined {
  const lang = useLocale() as Lang;
  const { data } = useQuery({
    enabled,
    queryKey: ["lineup-catalog", lang],
    queryFn: async () => {
      const res = await fetch(`/api/lineup/catalog?lang=${lang}`);
      if (!res.ok) throw new Error(`lineup catalog: ${res.status}`);
      return (await res.json()) as LineupCatalog;
    },
    staleTime: 10 * 60_000,
  });
  return data;
}

const NONE: readonly string[] = [];

/**
 * What a What for? room's gostos and missions leave: the characters that can
 * go to auction (the server wants MIN_POOL of them) and the missions it draws.
 */
export function useLineupCount(room: {
  game: GameKey;
  offGostos: readonly Gosto[];
  heavy?: boolean;
  offMissions?: readonly string[];
}) {
  const catalog = useLineupCatalog(room.game === "lineup");
  const { game, offGostos, heavy = true, offMissions = NONE } = room;
  return useMemo(() => {
    if (!catalog || game !== "lineup") return null;
    const on = GOSTOS.reduce(
      (m, g, i) => (offGostos.includes(g.key) ? m : m | (1 << i)),
      0,
    );
    let cards = 0;
    let total = 0;
    for (const [mask, n] of Object.entries(catalog.cards)) {
      total += n;
      if (Number(mask) & on) cards += n;
    }
    const missions = roomMissions(catalog.missions, {
      heavy,
      off: offMissions,
    }).length;
    return {
      cards,
      /** The deal would refuse: the start says why. */
      tooFew: !cards || cards < Math.min(MIN_POOL, total),
      missions,
      allMissions: catalog.missions.length,
    };
  }, [catalog, game, offGostos, heavy, offMissions]);
}
