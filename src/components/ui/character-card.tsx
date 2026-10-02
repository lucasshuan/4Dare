"use client";

import { motion } from "motion/react";
import type { CardView } from "@/game/types";
import { cn } from "@/lib/cn";
import { layoutSpring } from "@/lib/motion";
import { Portrait } from "./portrait";

/** The big card: a picture, the name and where it is from. Hidden cards show "?". */
export function CharacterCard({
  card,
  hidden,
  label,
  title,
  meta,
  tone = "other",
  found,
  layoutId,
  className,
}: {
  card: CardView | null;
  hidden?: boolean;
  label: string;
  /** Shown instead of the name when hidden (e.g. "Quem é você?"). */
  title?: string;
  meta?: string | null;
  tone?: "you" | "other" | "neutral";
  found?: boolean;
  layoutId?: string;
  className?: string;
}) {
  return (
    <motion.article
      layoutId={layoutId}
      transition={layoutSpring}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl bg-surface p-3 pb-4 shadow-card",
        found && "outline-[3px] outline-yes outline-solid",
        className,
      )}
    >
      <span
        className={cn(
          "self-start rounded-pill px-3 py-0.5 font-semibold text-[13px] leading-[18px]",
          tone === "you"
            ? "bg-sky-soft"
            : tone === "other"
              ? "bg-apricot-soft"
              : "bg-sunken",
        )}
      >
        {label}
      </span>
      {hidden ? (
        <span className="flex aspect-[4/5] w-full items-center justify-center rounded-lg bg-sky-soft font-display font-extrabold text-[clamp(96px,14vw,208px)] text-sky leading-none">
          ?
        </span>
      ) : (
        <Portrait src={card?.imageUrl ?? null} tone={tone} />
      )}
      <h2 className="mx-2 font-bold font-display text-[clamp(22px,2.4vw,30px)] leading-tight tracking-[-0.01em] [text-wrap:balance]">
        {hidden ? title : (card?.name ?? title)}
      </h2>
      {(hidden ? meta : (card?.origin ?? meta)) ? (
        <p className="mx-2 font-medium text-[13px] text-ink-muted leading-[18px]">
          {hidden ? meta : (card?.origin ?? meta)}
        </p>
      ) : null}
    </motion.article>
  );
}
