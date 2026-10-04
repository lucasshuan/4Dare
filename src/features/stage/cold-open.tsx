"use client";

import type { ShowView } from "@/game/types";

export interface ColdOpenProps {
  /** The opening show (its curtain, intro or round beat is running). */
  show: ShowView;
}

/**
 * The cold open of the room's first match, or the "Round N" card of a later
 * one. Placeholder until the scene lands (WP7): renders nothing, so the
 * screen under it shows as before.
 */
export function ColdOpen(_props: ColdOpenProps) {
  return null;
}
