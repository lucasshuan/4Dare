import type { ComponentProps, ReactNode } from "react";
import { thumbUrl } from "@/game/character-search";
import { cn } from "@/lib/cn";
import { frameStyle } from "./card-frame";
import { Portrait } from "./portrait";

/**
 * A small character card: picture, name, an optional line under it, in the
 * collectible's frame (the colour of the player whose card it is, the brand
 * blue for a card nobody holds). The stage's cards (cold open, the rule's
 * ✓✓✗, the pick hand, the cast table) share it; each scene sets the width
 * and moves it around.
 */
export function MiniCard({
  image,
  face,
  name,
  sub,
  width,
  seat,
  badge,
  className,
  style,
  ...rest
}: {
  /** The picture's URL (a thumbnail is fetched), or null for the silhouette. */
  image: string | null;
  /** Drawn instead of the picture (a "?" card); keep it 4:5. */
  face?: ReactNode;
  name: ReactNode;
  /** The small line under the name (where it is from, a heart and a count). */
  sub?: ReactNode;
  /** Card width in px. */
  width: number;
  /** The colour slot of the player whose card it is: the frame's colour. */
  seat?: number | null;
  /** Pinned over the top right corner (the rule's ✓ and ✗). */
  badge?: ReactNode;
} & Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      {...rest}
      style={{ width, ...frameStyle(seat), ...style }}
      className={cn(
        "q-marks relative flex shrink-0 flex-col rounded-[14px] p-[5px] shadow-card",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.25 rounded-[10px] bg-surface px-1 pt-1 pb-2 text-ink">
        {face ?? (
          <Portrait
            src={thumbUrl(image, width * 2)}
            className="rounded-[7px]"
          />
        )}
        <b className="truncate px-0.75 font-bold text-[12.5px] leading-[1.15]">
          {name}
        </b>
        {sub ? (
          <small className="flex items-center gap-0.75 px-0.75 font-semibold text-[11px] text-ink-muted leading-normal">
            {sub}
          </small>
        ) : null}
      </div>
      {badge ? (
        <span className="absolute -top-2.5 -right-2.5">{badge}</span>
      ) : null}
    </div>
  );
}
