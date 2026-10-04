"use client";

import type { ShowView } from "@/game/types";

export interface PickIntroProps {
  /** The theme show (its draw or target beat is running). */
  show: ShowView;
}

/**
 * The draw and "for whom": who you pick a character for. Placeholder until
 * the scene lands (WP8): renders nothing, so the pick screen shows as before.
 */
export function PickIntro(_props: PickIntroProps) {
  return null;
}
