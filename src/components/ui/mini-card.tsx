import type { ComponentProps, ReactNode } from "react";
import { thumbUrl } from "@/game/character-search";
import { cn } from "@/lib/cn";
import { Portrait } from "./portrait";

/**
 * A small character card: picture, name, an optional line under it. The
 * stage's cards (cold open, the rule's ✓✓✗, the pick hand, the cast table)
 * share it; each scene sets the width and moves it around.
 */
export function MiniCard({
  image,
  face,
  name,
  sub,
  width,
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
  /** Pinned over the top right corner (the rule's ✓ and ✗). */
  badge?: ReactNode;
} & Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      {...rest}
      style={{ width, ...style }}
      className={cn(
        "relative flex shrink-0 flex-col gap-1.25 rounded-md bg-surface px-1.5 pt-1.5 pb-2 shadow-card",
        className,
      )}
    >
      {face ?? (
        <Portrait src={thumbUrl(image, width * 2)} className="rounded-[11px]" />
      )}
      <b className="truncate px-0.75 font-bold text-[12.5px] leading-[1.15]">
        {name}
      </b>
      {sub ? (
        <small className="flex items-center gap-0.75 px-0.75 font-semibold text-[11px] text-ink-muted leading-normal">
          {sub}
        </small>
      ) : null}
      {badge ? (
        <span className="absolute -top-2.5 -right-2.5">{badge}</span>
      ) : null}
    </div>
  );
}
