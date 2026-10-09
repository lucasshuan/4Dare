"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMemo } from "react";
import type { GameKey } from "@/game/games";
import { roomMissions } from "@/game/lineup/bank";
import { MIN_POOL, roomDeck } from "@/game/lineup/deal";
import { TASTES, type Taste } from "@/game/tastes";
import type { Lang } from "@/game/types";
import type { LineupCatalog } from "@/server/contract";

/** What for?'s missions and the reader's deck by tastes: undefined until it arrives (or while not `enabled`). */
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
 * What a What for? room's tastes and missions leave: the characters that can
 * go to auction (the server wants MIN_POOL of them) and the missions it draws.
 */
export function useLineupCount(room: {
  game: GameKey;
  offTastes: readonly Taste[];
  heavy?: boolean;
  offMissions?: readonly string[];
}) {
  const catalog = useLineupCatalog(room.game === "lineup");
  const { game, offTastes, heavy = true, offMissions = NONE } = room;
  // the deck's cards with their tastes, once per catalog
  const deck = useMemo(
    () =>
      (catalog?.deck ?? []).map((mask) => ({
        tastes: TASTES.flatMap((g, i) => (mask & (1 << i) ? [g.key] : [])),
      })),
    [catalog],
  );
  return useMemo(() => {
    // a catalog cached from the previous deploy has no deck yet
    if (!catalog?.deck || game !== "lineup") return null;
    const cards = roomDeck(deck, offTastes).length;
    const total = deck.length;
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
  }, [catalog, deck, game, offTastes, heavy, offMissions]);
}
