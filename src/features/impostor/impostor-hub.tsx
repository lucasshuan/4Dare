"use client";

import { GameHub } from "@/features/home/game-hub";
import type { GameFactsData } from "@/server/community-contract";
import { ImpostorBanner } from "./impostor-banner";

/** The Impostor's page: create a room, join one with a code, or pick a public one. */
export function ImpostorHub({ facts }: { facts: GameFactsData | null }) {
  return <GameHub game="impostor" banner={ImpostorBanner} facts={facts} />;
}
