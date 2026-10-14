// The pictures the game art draws with: players' creatures and characters'
// figures on cards. Banners, thumbnails and scenes of every game share them.

import { useEffect, useState } from "react";
import { avatarUri } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { figureBitmap } from "@/lib/figure-bitmap";
import { type Figure, figureUri } from "@/lib/figures";

/** A player's creature on its pastel, round. */
export function Creature({
  dna,
  color,
  className,
}: {
  dna: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn("block overflow-hidden", className)}
      style={{ backgroundColor: color }}
    >
      {/* biome-ignore lint/performance/noImgElement: generated svg data uri */}
      <img src={avatarUri(dna)} alt="" className="size-full object-cover" />
    </span>
  );
}

/**
 * A character's picture on a card (see src/lib/figures.ts). `bitmap` swaps the
 * SVG for a bitmap of it once drawn: for cards that repaint every frame.
 */
export function FigureArt({
  figure,
  className,
  bitmap = false,
}: {
  figure: Figure;
  className?: string;
  bitmap?: boolean;
}) {
  const svg = figureUri(figure);
  const [src, setSrc] = useState(svg);
  useEffect(() => {
    setSrc(svg);
    if (!bitmap) return;
    let live = true;
    figureBitmap(svg).then(
      (url) => live && setSrc(url),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [svg, bitmap]);
  return (
    <span className={cn("block overflow-hidden", className)}>
      {/* biome-ignore lint/performance/noImgElement: generated svg data uri or its bitmap */}
      <img src={src} alt="" className="size-full object-cover" />
    </span>
  );
}

/** A card held up for the others to see: the character's picture. `fill` stretches it to its box (the flipped "?" card). */
export function HeldCard({
  figure,
  fill = false,
}: {
  figure: Figure;
  fill?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[2.1cqh] rounded-[14%/11%] bg-surface p-[7%] shadow-card",
        fill && "h-full",
      )}
    >
      <FigureArt
        figure={figure}
        className={cn("rounded-[12%]", fill ? "min-h-0 flex-1" : "aspect-4/5")}
      />
      <span className="mx-[6%] h-[2.1cqh] w-2/3 shrink-0 rounded-pill bg-line" />
    </div>
  );
}
