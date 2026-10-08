"use client";

import { GameHub } from "@/features/home/game-hub";
import { ImpostorBanner } from "./impostor-banner";

/** The Impostor's page: create a room, join one with a code, or pick a public one. */
export function ImpostorHub() {
  return <GameHub game="impostor" banner={<ImpostorBanner />} />;
}
