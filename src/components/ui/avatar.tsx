import type { Avatar as AvatarData } from "@/game/types";
import { avatarUri } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { seatColor } from "@/lib/seats";

// Larger faces (the stage's 120-150 px ones) pass `size-[…] text-[…]` in className.
const SIZE = {
  16: "size-4 text-[9px]",
  18: "size-4.5 text-[10px]",
  20: "size-5 text-[11px]",
  24: "size-6 text-xs",
  26: "size-6.5 text-xs",
  28: "size-7 text-[13px]",
  30: "size-7.5 text-[13px]",
  32: "size-8 text-sm",
  34: "size-8.5 text-sm",
  36: "size-9 text-[15px]",
  40: "size-10 text-base",
  44: "size-11 text-lg",
  48: "size-12 text-xl",
  52: "size-13 text-[22px]",
  64: "size-16 text-[26px]",
  68: "size-17 text-[28px]",
} as const;

/**
 * The ring in a player's room colour: a gap the colour of what is behind
 * (`--ring-gap`, the surface by default), then the colour; thinner on small faces.
 */
function seatRing(slot: number, size: number) {
  const [gap, ring] = size <= 28 ? [1.5, 3] : [2, 4];
  return `0 0 0 ${gap}px var(--ring-gap, var(--surface)), 0 0 0 ${ring}px ${seatColor(slot)}`;
}

/** A creature or a picture on a pastel. */
export function Avatar({
  avatar,
  size = 44,
  seat,
  className,
}: {
  avatar: AvatarData;
  size?: keyof typeof SIZE;
  /** In a room: the player's colour slot, drawn as a ring. */
  seat?: number | null;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        backgroundColor: avatar.color,
        ...(seat != null ? { boxShadow: seatRing(seat, size) } : null),
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill font-bold font-display text-on-avatar",
        SIZE[size],
        className,
      )}
    >
      {avatar.kind === "creature" ? (
        // biome-ignore lint/performance/noImgElement: generated svg data uri
        <img src={avatarUri(avatar.dna, size)} alt="" className="size-full" />
      ) : (
        // biome-ignore lint/performance/noImgElement: remote avatar pictures
        <img src={avatar.url} alt="" className="size-full object-cover" />
      )}
    </span>
  );
}
