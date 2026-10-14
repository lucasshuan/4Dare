"use client";

import { GamePage } from "@/features/game-page/game-page";
import type { GameFactsData } from "@/server/community-contract";

/** "Who am I?"'s page: a round of its rules, create a room, join one with a code, or pick a public one. */
export function WhoAmIHub({ facts }: { facts: GameFactsData | null }) {
  return <GamePage game="who-am-i" facts={facts} />;
}
