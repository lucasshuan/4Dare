// A lot's card: the character's picture (4:5, like every card on the site),
// or an extra's emoji on its tint. On a board it is a photo taped on, with the
// price it cost on a kraft tag.
import { Portrait } from "@/components/ui/portrait";
import type { LuCard } from "@/game/lineup/types";
import { cn } from "@/lib/cn";

/** The card's picture, filling its 4:5 box. */
export function CardFace({
  card,
  className,
}: {
  card: LuCard;
  className?: string;
}) {
  if (card.imageUrl)
    return (
      <Portrait
        src={card.imageUrl}
        className={cn("rounded-[3px]", className)}
      />
    );
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-[3px] [container-type:inline-size]",
        className,
      )}
      style={{ background: card.tint ?? "#fde2c8" }}
    >
      <span className="text-[52cqw] leading-none">{card.emoji}</span>
    </span>
  );
}

/** The price a card cost, on a kraft tag; 0 is a free leftover. */
export function PriceTag({
  price,
  className,
}: {
  price: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] rotate-[4deg] items-center gap-1 whitespace-nowrap rounded-[6px] bg-kraft px-2 font-mono font-semibold text-[15px] text-kraft-ink shadow-[0_2px_4px_rgba(0,0,0,0.3)]",
        className,
      )}
    >
      {price}
      <svg aria-hidden="true" viewBox="0 0 48 30" className="h-3 w-4">
        <path d="M1 11v8a23 6 0 0 0 46 0v-8Z" fill="#b58a1e" />
        <ellipse cx="24" cy="11" rx="23" ry="7" fill="#e7b94a" />
      </svg>
    </span>
  );
}

/**
 * A photo taped on: white border, a strip of tape on top, the price tag in
 * the corner. `width` is the picture's (the border adds 6 on each side).
 */
export function Sticker({
  card,
  width,
  tilt = 0,
  price,
  className,
}: {
  card: LuCard;
  /** The picture's width; without it the sticker fills its box. */
  width?: number;
  tilt?: number;
  price?: number | null;
  className?: string;
}) {
  return (
    <span
      className={cn("relative block", className)}
      style={width ? { width: width + 12 } : undefined}
    >
      <span
        className={cn(
          "relative block rounded-[4px] p-1.5 shadow-[0_2px_0_rgba(0,0,0,0.12),0_8px_16px_rgba(0,0,0,0.35)]",
          card.imageUrl ? "bg-white" : "bg-[#fff6e2]",
        )}
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        <CardFace card={card} />
        <span className="absolute top-[-9px] left-[27%] h-[18px] w-[46%] -rotate-3 bg-[rgba(246,227,161,0.8)] shadow-[0_1px_2px_rgba(0,0,0,0.15)]" />
      </span>
      {price != null ? (
        <PriceTag price={price} className="absolute -right-2.5 -bottom-2" />
      ) : null}
    </span>
  );
}
