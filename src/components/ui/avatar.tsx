import { UserRound } from "lucide-react";
import type { Avatar as AvatarData } from "@/game/types";
import { cn } from "@/lib/cn";
import { critterUri } from "./critter";

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

/** A critter on a pastel, a picture, or (older avatars) an initial / person icon on a pastel. */
export function Avatar({
  avatar,
  isGuest,
  name,
  size = 44,
  ring,
  className,
}: {
  avatar: AvatarData;
  isGuest: boolean;
  name: string | null;
  size?: keyof typeof SIZE;
  ring?: "sky" | "apricot";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: avatar.color }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill font-bold font-display text-on-avatar",
        SIZE[size],
        ring === "sky" &&
          "shadow-[0_0_0_3px_var(--canvas),0_0_0_6px_var(--sky)]",
        ring === "apricot" &&
          "shadow-[0_0_0_3px_var(--canvas),0_0_0_6px_var(--apricot)]",
        className,
      )}
    >
      {avatar.kind === "critter" ? (
        // biome-ignore lint/performance/noImgElement: generated svg data uri
        <img
          src={critterUri(avatar.seed, avatar.color)}
          alt=""
          className="size-full"
        />
      ) : avatar.kind === "image" ? (
        // biome-ignore lint/performance/noImgElement: remote avatar pictures
        <img src={avatar.url} alt="" className="size-full object-cover" />
      ) : isGuest || !name ? (
        <UserRound className="size-[55%]" strokeWidth={1.75} />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}
