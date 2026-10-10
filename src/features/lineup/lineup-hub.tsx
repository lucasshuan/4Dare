"use client";

import { GameHub } from "@/features/home/game-hub";
import type { GameFactsData } from "@/server/community-contract";
import { LineupBanner } from "./lineup-banner";
import { Priciest } from "./priciest";

/** What for?'s page: create a room, join one with a code, or pick a public one; the priciest characters under. */
export function LineupHub({ facts }: { facts: GameFactsData | null }) {
  return (
    <GameHub
      game="lineup"
      banner={LineupBanner}
      extra={<Priciest />}
      facts={facts}
    />
  );
}
