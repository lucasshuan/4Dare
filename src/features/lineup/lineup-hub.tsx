"use client";

import { GamePage } from "@/features/game-page/game-page";
import type { GameFactsData } from "@/server/community-contract";
import { Priciest } from "./priciest";

/** What for?'s page: a round of its rules, create a room, join one with a code, or pick a public one; the priciest characters under the pitch. */
export function LineupHub({ facts }: { facts: GameFactsData | null }) {
  return <GamePage game="lineup" extra={<Priciest />} facts={facts} />;
}
