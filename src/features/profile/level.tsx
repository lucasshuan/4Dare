"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/avatar";
import { levelOf } from "@/game/profile/xp";
import type { Avatar as AvatarData } from "@/game/types";
import { cn } from "@/lib/cn";

/** The gap between the face and the ring, and the outline around it all (px). */
const GAP = 2;

/** What a ring or a tag sits on: its gap and outline take that colour. */
type On = "canvas" | "surface" | "sunken";
const GROUND: Record<
  On,
  { bg: string; color: string; outline: string; track: string }
> = {
  canvas: {
    track: "stroke-sunken",
    bg: "bg-canvas",
    color: "var(--canvas)",
    outline: "shadow-[0_0_0_2px_var(--canvas)]",
  },
  surface: {
    track: "stroke-sunken",
    bg: "bg-surface",
    color: "var(--surface)",
    outline: "shadow-[0_0_0_2px_var(--surface)]",
  },
  sunken: {
    // the sunken track would vanish on a sunken ground
    track: "stroke-line",
    bg: "bg-sunken",
    color: "var(--surface-sunken)",
    outline: "shadow-[0_0_0_2px_var(--surface-sunken)]",
  },
};

/**
 * A face inside its level's ring: a thick neutral track, the XP into the
 * level in the accent (round ends), the level on a tag at the bottom right.
 * `stroke` is the ring's thickness (5 on a profile, 3 on cards); the face's
 * size comes from `avatarClass`.
 */
export function LevelAvatar({
  avatar,
  xp,
  stroke,
  avatarClass,
  tag = "md",
  on = "canvas",
  className,
}: {
  avatar: AvatarData;
  xp: number;
  stroke: number;
  avatarClass: string;
  /** "none": the ring alone (the editor, where the face is a button). */
  tag?: "sm" | "md" | "none";
  /** What it sits on: the gap and the outline take that colour. */
  on?: On;
  className?: string;
}) {
  const t = useTranslations("profile.level");
  const format = useFormatter();
  const { level, into, need } = levelOf(xp);
  const share = need ? into / need : 0;
  const ring: CSSProperties = { r: `calc(50% - ${stroke / 2}px)` };
  return (
    <span
      role="img"
      aria-label={t("ring", {
        n: level,
        into: format.number(into),
        need: format.number(need),
      })}
      className={cn(
        "relative inline-flex shrink-0 rounded-pill",
        GROUND[on].bg,
        className,
      )}
      style={{
        padding: GAP + stroke,
        boxShadow: `0 0 0 ${GAP}px ${GROUND[on].color}`,
      }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full -rotate-90 overflow-visible"
      >
        <circle
          cx="50%"
          cy="50%"
          style={ring}
          fill="none"
          strokeWidth={stroke}
          className={GROUND[on].track}
        />
        <circle
          cx="50%"
          cy="50%"
          style={ring}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={100}
          // a sliver shows even at 0, so the ring reads as progress from the start
          strokeDashoffset={100 - Math.max(1.5, share * 100)}
          className="stroke-(--accent)"
        />
      </svg>
      <Avatar avatar={avatar} className={avatarClass} />
      {tag === "none" ? null : (
        <LevelTag
          level={level}
          size={tag}
          on={on}
          className={cn(
            "absolute",
            tag === "md" ? "right-0 bottom-1.5" : "-right-0.5 -bottom-0.5",
          )}
        />
      )}
    </span>
  );
}

/** "Nv 14" on the accent, outlined like the ring. */
export function LevelTag({
  level,
  size = "md",
  on = "canvas",
  className,
}: {
  level: number;
  size?: "sm" | "md";
  on?: On;
  className?: string;
}) {
  const t = useTranslations("profile.level");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-pill bg-(--accent) text-(--on-accent) leading-none tabular-nums",
        GROUND[on].outline,
        size === "md"
          ? "h-[26px] items-center px-[9px] font-display font-extrabold text-[14px]"
          : "px-1.5 py-[3px] font-bold text-[11px]",
        className,
      )}
    >
      <small
        className={cn(
          "font-bold opacity-85",
          size === "md"
            ? "font-sans text-[11px] tracking-[0.02em]"
            : "text-[0.78em]",
        )}
      >
        {t("tag")}
      </small>
      {level}
    </span>
  );
}

/** XP into the level, as a bar; the numbers under it. */
export function XpBar({
  xp,
  note,
  height = 6,
  numbers = true,
  className,
}: {
  xp: number;
  /** Beside the XP on the right (a streak). */
  note?: React.ReactNode;
  /** The bar's thickness (px). */
  height?: number;
  /** False hides the numbers under the bar. */
  numbers?: boolean;
  className?: string;
}) {
  const t = useTranslations("profile.level");
  const format = useFormatter();
  const { into, need } = levelOf(xp);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div
        className="overflow-hidden rounded-pill bg-sunken"
        style={{ height }}
      >
        <i
          className="block h-full rounded-pill bg-(--accent)"
          style={{ width: `${Math.max(2, (into / need) * 100)}%` }}
        />
      </div>
      {numbers ? (
        <div className="flex justify-between gap-2 font-semibold text-[12px] text-ink-muted">
          <span className="font-mono tabular-nums">
            {t("xp", { into: format.number(into), need: format.number(need) })}
          </span>
          {note}
        </div>
      ) : null}
    </div>
  );
}
