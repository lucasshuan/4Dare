"use client";

import type { ShowView } from "@/game/types";

export interface CastSceneProps {
  /** The cast show (its received or order beat is running). */
  show: ShowView;
}

/**
 * Your character ("Rafa picked yours") and the turn order. Placeholder until
 * the scene lands (WP10): renders nothing, so the turn screen shows as before.
 */
export function CastScene(_props: CastSceneProps) {
  return null;
}
