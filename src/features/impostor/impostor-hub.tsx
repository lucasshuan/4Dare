"use client";

import { GamePage } from "@/features/game-page/game-page";
import type { GameFactsData } from "@/server/community-contract";

/** The Impostor's page: a round of its rules, create a room, join one with a code, or pick a public one. */
export function ImpostorHub({ facts }: { facts: GameFactsData | null }) {
  return <GamePage game="impostor" facts={facts} />;
}
