"use client";

import type { ReactNode } from "react";
import type { CardView } from "@/game/types";
import { cn } from "@/lib/cn";
import { CardBack, FrameSeal, frameStyle } from "./card-frame";
import { Portrait } from "./portrait";

/**
 * The big card, a collectible: a frame in the colour of the player whose
 * card it is, their avatar and name on it, and a white panel with the
 * picture, the name and where it is from. A hidden card shows its back
 * where the picture would be.
 */
export function CharacterCard({
  card,
  hidden,
  owner,
  seat,
  title,
  meta,
  found,
  className,
}: {
  card: CardView | null;
  hidden?: boolean;
  /** Whose card it is, on the frame (their avatar and name). */
  owner: ReactNode;
  /** Their colour slot: the frame's colour. */
  seat: number | null;
  /** Shown instead of the name when hidden (e.g. "Quem é você?"). */
  title?: string;
  meta?: ReactNode;
  found?: boolean;
  className?: string;
}) {
  const sub = hidden ? meta : (card?.origin ?? meta);
  return (
    <article
      style={frameStyle(seat)}
      className={cn(
        "q-marks flex w-full flex-col gap-2 rounded-[26px] px-2.5 pt-2 pb-2.5 shadow-pop",
        found && "outline-[3px] outline-offset-2 outline-yes outline-solid",
        className,
      )}
    >
      <header className="flex min-h-7 items-center justify-between gap-2 px-1.5 font-bold text-[15px] leading-tight">
        <span className="min-w-0 truncate">{owner}</span>
        <FrameSeal />
      </header>
      <div className="flex flex-1 flex-col gap-3 rounded-[18px] bg-surface p-2 pb-4 text-ink">
        {hidden ? (
          <CardBack seat={seat} logo className="rounded-[12px]" />
        ) : (
          <Portrait src={card?.imageUrl ?? null} className="rounded-[12px]" />
        )}
        <h2 className="mx-2 font-bold font-display text-[clamp(22px,2.4vw,30px)] leading-tight tracking-[-0.01em] [text-wrap:balance]">
          {hidden ? title : (card?.name ?? title)}
        </h2>
        {sub ? (
          <p className="-mt-1.5 mx-2 font-medium text-[13px] text-ink-muted leading-[18px]">
            {sub}
          </p>
        ) : null}
      </div>
    </article>
  );
}
