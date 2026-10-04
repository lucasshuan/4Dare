"use client";

import type { ShowView } from "@/game/types";

export interface ThemeStageProps {
  /** The theme show (its theme or rule beat is running). */
  show: ShowView;
  /** How the theme was chosen: by the vote (the winner card flies in) or typed by the host. */
  from: "vote" | "typed";
}

/**
 * The theme hero and the rule (cards or a sentence). Placeholder until the
 * scene lands (WP7): renders nothing, so the screen under it shows as before.
 */
export function ThemeStage(_props: ThemeStageProps) {
  return null;
}
