"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Portrait } from "@/components/ui/portrait";
import { thumbUrl } from "@/game/character-search";
import { cn } from "@/lib/cn";
import { AVATAR_COLORS, type ShowcaseView } from "@/server/contract";

/** Each card's own tilt and tint, so three side by side never look stamped. */
const TILT = ["-2.5deg", "1.8deg", "-1deg"];
const TINT = [AVATAR_COLORS[7], AVATAR_COLORS[2], AVATAR_COLORS[6]];

/** One showcase card: the character's picture, name and origin, tilted, with the owner's line under it. */
export function ShowcaseCard({
  item,
  index,
  children,
  className,
  still = false,
}: {
  item: Pick<ShowcaseView, "caption" | "character">;
  index: number;
  /** Replaces the caption (the editor's field). */
  children?: React.ReactNode;
  className?: string;
  /** Upright (the editor: its field and buttons must not lean). */
  still?: boolean;
}) {
  const c = item.character;
  return (
    <figure
      className={cn(
        "m-0 flex w-[116px] shrink-0 flex-col",
        !still &&
          "rotate-(--r) transition-transform duration-[260ms] ease-[ease] hover:-translate-y-1 hover:rotate-0",
        className,
      )}
      style={
        { "--r": still ? "0deg" : TILT[index % TILT.length] } as CSSProperties
      }
    >
      <div className="flex flex-col gap-0.5 rounded-[18px] bg-surface p-1.5 pb-[9px] shadow-card">
        <div
          className="q-marks mb-1.5 overflow-hidden rounded-[13px]"
          style={{ backgroundColor: TINT[index % TINT.length] }}
        >
          <Portrait
            src={thumbUrl(c?.imageUrl ?? null, 232)}
            className="rounded-[13px] bg-transparent"
          />
        </div>
        <b className="truncate px-1 font-bold font-display text-[13.5px] leading-[1.15] tracking-[-0.01em]">
          {c?.name ?? "?"}
        </b>
        {c?.origin ? (
          <small className="truncate px-1 font-semibold text-[11px] text-ink-muted">
            {c.origin}
          </small>
        ) : null}
      </div>
      {children ??
        (item.caption ? (
          <figcaption className="relative mt-[11px] mr-0.5 ml-2 rotate-[calc(var(--r)*-1.6)] self-start rounded-[14px] bg-ink px-2.5 py-[7px] font-display font-semibold text-[12.5px] text-on-ink leading-[1.3] shadow-card before:absolute before:-top-[5px] before:left-3.5 before:size-3 before:rotate-45 before:rounded-[3px] before:bg-inherit">
            <span className="relative">{item.caption}</span>
          </figcaption>
        ) : null)}
    </figure>
  );
}

/**
 * The owner's showcase: up to three characters side by side; on phones a
 * carousel that snaps card by card, with dots for where you are.
 */
export function Showcase({ items }: { items: ShowcaseView[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const seen = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setAt(Number((e.target as HTMLElement).dataset.index));
      },
      { root: el, threshold: 0.6 },
    );
    for (const child of el.querySelectorAll("[data-index]"))
      seen.observe(child);
    return () => seen.disconnect();
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={track}
        className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto px-[calc(50%-70px)] py-3.5 [scrollbar-width:none] sm:snap-none sm:justify-end sm:gap-[18px] sm:overflow-visible sm:px-1 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={item.characterId}
            data-index={i}
            className="flex shrink-0 snap-center"
          >
            <ShowcaseCard
              item={item}
              index={i}
              className="w-[140px] sm:w-[116px]"
            />
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div aria-hidden="true" className="flex gap-1.5 sm:hidden">
          {items.map((item, i) => (
            <i
              key={item.characterId}
              className={cn(
                "block h-[7px] rounded-pill transition-[width,background-color] duration-200",
                i === at ? "w-5 bg-ink" : "w-[7px] bg-line-strong",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
