"use client";

import { GameHub } from "@/features/home/game-hub";
import { WhoAmIBanner } from "./who-am-i-banner";

/** "Who am I?"'s page: create a room, join one with a code, or pick a public one. */
export function WhoAmIHub() {
  return <GameHub game="who-am-i" banner={<WhoAmIBanner />} />;
}
