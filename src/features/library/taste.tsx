"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { TASTES, type Taste } from "@/game/tastes";
import { cn } from "@/lib/cn";

/**
 * Each taste's pastel: like an avatar's ground, the same in both themes
 * (ink text on it always reads).
 */
export const TASTE_TINT: Record<Taste, string> = {
  anime: "#f4c7d9",
  animation: "#f3d3b8",
  live: "#d9c7f4",
  games: "#bfe6c8",
  comics: "#dce8fa",
  books: "#f2e3a8",
  faith: "#bfe3ea",
  real: "#d7dde8",
};

export const tasteEmoji = (taste: Taste) =>
  TASTES.find((t) => t.key === taste)?.emoji ?? "";

export const tasteStyle = (taste: Taste | null): CSSProperties =>
  ({ "--taste": taste ? TASTE_TINT[taste] : "#d7dde8" }) as CSSProperties;

/** A taste's name. */
export function useTasteName() {
  const t = useTranslations("common.tastes");
  return (taste: Taste) => t(`${taste}.name`);
}

/** A small pill in the taste's pastel: its emoji and name. */
export function TasteTag({
  taste,
  className,
}: {
  taste: Taste;
  className?: string;
}) {
  const name = useTasteName();
  return (
    <span
      style={tasteStyle(taste)}
      className={cn(
        "inline-flex h-6 min-w-0 items-center gap-1 overflow-hidden rounded-pill bg-(--taste) px-2 font-bold text-[11.5px] text-on-avatar shadow-[0_1px_3px_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      <span aria-hidden="true">{tasteEmoji(taste)}</span>
      <span className="truncate">{name(taste)}</span>
    </span>
  );
}

/** A chip to filter or pick by taste: its pastel when pressed. */
export function TasteChip({
  taste,
  on,
  onClick,
}: {
  taste: Taste;
  on: boolean;
  onClick: () => void;
}) {
  const name = useTasteName();
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={tasteStyle(taste)}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill border px-3.5 font-semibold text-sm transition-[background-color,border-color,color,scale] duration-150 ease-soft active:scale-[0.96]",
        on
          ? "border-transparent bg-(--taste) text-on-avatar shadow-[inset_0_0_0_1.5px_rgb(30_36_51/0.22)]"
          : "border-line bg-surface hover:bg-sunken",
      )}
    >
      <span aria-hidden="true" className="text-[15px] leading-none">
        {tasteEmoji(taste)}
      </span>
      {name(taste)}
    </button>
  );
}
