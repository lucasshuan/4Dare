"use client";

import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { ImpostorSnapshot } from "@/features/home/impostor-snapshot";
import { ImpostorThumb } from "@/features/home/impostor-thumb";
import { LineupSnapshot } from "@/features/home/lineup-snapshot";
import { LineupThumb } from "@/features/home/lineup-thumb";
import { WhoAmISnapshot } from "@/features/home/who-am-i-snapshot";
import { WhoAmIThumb } from "@/features/home/who-am-i-thumb";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";

// Kept apart from the game select (game-field.tsx), so the screens that only
// show a game's name and picture don't load the select with them.

/** What the screens show for each game: its messages (home.games.<key>), its card art and its small thumbnail. */
export const GAME_INFO: Record<
  GameKey,
  {
    messages: "whoAmI" | "impostor" | "whatFor";
    /**
     * The home tile, a square ~170–344px wide. Tips: the name, players and Play
     * cover its bottom ~40% (on hover; always on phones), so keep the scene up
     * and centred; size it in % or cq units so it scales.
     */
    Art: ComponentType<{
      className?: string;
      still?: boolean;
      /** Laid out for a 2:1 strip instead (the lobby's game panel). */
      wide?: boolean;
    }>;
    /** Drawn for small boxes (16:10): fills whatever box it is given. */
    Thumb: ComponentType;
  }
> = {
  "who-am-i": { messages: "whoAmI", Art: WhoAmISnapshot, Thumb: WhoAmIThumb },
  impostor: {
    messages: "impostor",
    Art: ImpostorSnapshot,
    Thumb: ImpostorThumb,
  },
  lineup: { messages: "whatFor", Art: LineupSnapshot, Thumb: LineupThumb },
};

/** The game's name, as the hub card shows it. */
export function useGameName() {
  const t = useTranslations("home.games");
  return (game: GameKey) => t(`${GAME_INFO[game].messages}.name`);
}

/** Thumbnail boxes, all 16:10. */
const THUMB = {
  md: "h-14 w-[89.6px]",
  sm: "h-10 w-16",
  xs: "h-6 w-[38.4px]",
  tiny: "h-[15px] w-6 rounded-[4px]",
} as const;

/** The game's small thumbnail, its own drawing (the card art turns to mush scaled this far down). */
export function GameThumb({
  game,
  size = "md",
}: {
  game: GameKey;
  size?: keyof typeof THUMB;
}) {
  const { Thumb } = GAME_INFO[game];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-md",
        THUMB[size],
      )}
    >
      <Thumb />
    </span>
  );
}
