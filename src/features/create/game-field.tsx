"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import { WhoAmISnapshot } from "@/features/home/who-am-i-snapshot";
import { WhoAmIThumb } from "@/features/home/who-am-i-thumb";
import { GAME_KEYS, type GameKey } from "@/game/games";
import { cn } from "@/lib/cn";

/** What the screens show for each game: its messages (home.games.<key>), its card art and its small thumbnail. */
export const GAME_INFO: Record<
  GameKey,
  {
    messages: "whoAmI";
    Art: ComponentType<{ className?: string; still?: boolean }>;
    /** Drawn for small boxes (16:10): fills whatever box it is given. */
    Thumb: ComponentType;
  }
> = {
  "who-am-i": { messages: "whoAmI", Art: WhoAmISnapshot, Thumb: WhoAmIThumb },
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

/**
 * The room's game, a select beside the submit button. Its width is fixed, since
 * a game's name can run longer in other languages. Set when creating a room and
 * switchable in the lobby.
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
  const players = (game: GameKey) => tg(`${GAME_INFO[game].messages}.players`);
  return (
    <Select.Root
      items={GAME_KEYS.map((game) => ({ value: game, label: name(game) }))}
      value={value}
      onValueChange={(game) => {
        if (game) onChange(game as GameKey);
      }}
    >
      <Select.Trigger
        aria-label={t("game")}
        className="flex h-16 w-full shrink-0 sm:w-72 items-center gap-3 rounded-pill border-[1.5px] border-line bg-surface py-1.5 pr-5 pl-3 text-left transition-[border-color,box-shadow] duration-200 ease-soft hover:border-line-strong data-popup-open:border-ink data-popup-open:shadow-card"
      >
        <GameThumb game={value} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <Select.Value className="truncate font-bold font-display text-lg leading-tight">
            {(game: GameKey) => name(game)}
          </Select.Value>
          <span className="truncate font-medium text-[13px] text-ink-muted">
            {players(value)}
          </span>
        </span>
        <Select.Icon className="text-ink-muted">
          <ChevronDown className="size-5" strokeWidth={2} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          sideOffset={6}
          align="start"
          alignItemWithTrigger={false}
          className="z-50 outline-none"
        >
          <Select.Popup className="w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-lg bg-surface p-1.5 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
            <Select.List>
              {GAME_KEYS.map((game) => (
                <Select.Item
                  key={game}
                  value={game}
                  className="flex items-center gap-3 rounded-md p-1.5 pr-3 outline-none select-none data-highlighted:bg-sky-soft"
                >
                  <GameThumb game={game} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Select.ItemText className="truncate font-bold font-display leading-tight">
                      {name(game)}
                    </Select.ItemText>
                    <span className="truncate font-medium text-[13px] text-ink-muted">
                      {players(game)}
                    </span>
                  </span>
                  <Select.ItemIndicator className="text-sky">
                    <Check className="size-4" strokeWidth={2.25} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
