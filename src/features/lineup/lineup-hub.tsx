"use client";

import { GameHub } from "@/features/who-am-i/who-am-i-screen";
import { LineupBanner } from "./lineup-banner";

/** What for?'s page: create a room, join one with a code, or pick a public one. */
export function LineupHub() {
  return <GameHub game="lineup" banner={<LineupBanner />} />;
}
