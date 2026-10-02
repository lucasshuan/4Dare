"use client";

import { useTranslations } from "next-intl";
import { type ComponentType, useId } from "react";
import { HintLabel } from "@/components/ui/hint-label";
import { WhoAmISnapshot } from "@/features/home/who-am-i-snapshot";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { cn } from "@/lib/cn";

/** What the screens show for each game: its messages (home.games.<key>) and its card art. */
export const GAME_INFO: Record<
  GameKey,
  {
    messages: "whoAmI";
    Art: ComponentType<{ className?: string; still?: boolean }>;
  }
> = {
  "who-am-i": { messages: "whoAmI", Art: WhoAmISnapshot },
};

/** The game's name, as the hub card shows it. */
export function useGameName() {
  const t = useTranslations("home.games");
  return (game: GameKey) => t(`${GAME_INFO[game].messages}.name`);
}

/** Thumbnail sizes: the box, and the scale that fits the 320×200 card art into it. */
const THUMB = {
  md: ["h-14 w-[89.6px]", "scale-[0.28]"],
  sm: ["h-10 w-16", "scale-[0.2]"],
  xs: ["h-6 w-[38.4px]", "scale-[0.12]"],
} as const;

/** The game's card art, scaled down to a still thumbnail. */
export function GameThumb({
  game,
  size = "md",
}: {
  game: GameKey;
  size?: keyof typeof THUMB;
}) {
  const { Art } = GAME_INFO[game];
  const [box, scale] = THUMB[size];
  return (
    <span
      aria-hidden="true"
      className={cn("relative block shrink-0 overflow-hidden rounded-md", box)}
    >
      <span className={cn("absolute top-0 left-0 w-80 origin-top-left", scale)}>
        <Art still />
      </span>
    </span>
  );
}

/**
 * The room's game, as tabs with each game's picture and name: the first thing
 * set when creating a room, and switchable in the lobby.
 */
export function GameField({
  value,
  onChange,
}: {
  value: GameKey;
  onChange: (game: GameKey) => void;
}) {
  const t = useTranslations("home.createRoom");
  const tg = useTranslations("home.games");
  const name = useGameName();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-2">
      <HintLabel hint={t("gameHint")} hintId={hintId}>
        {t("game")}
      </HintLabel>
      <fieldset
        aria-describedby={hintId}
        className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0"
      >
        <legend className="sr-only">{t("game")}</legend>
        {GAME_KEYS.map((game) => {
          const on = game === value;
          return (
            <button
              key={game}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(game)}
              className={cn(
                "flex items-center gap-3 rounded-lg border-[1.5px] bg-surface p-1.5 pr-5 text-left transition-[border-color,box-shadow] duration-200 ease-soft",
                on
                  ? "border-ink shadow-card"
                  : "border-line hover:border-line-strong",
              )}
            >
              <GameThumb game={game} />
              <span className="flex flex-col">
                <span className="font-bold font-display text-lg leading-tight">
                  {name(game)}
                </span>
                <span className="font-medium text-[13px] text-ink-muted">
                  {tg(`${GAME_INFO[game].messages}.players`)}
                </span>
              </span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
