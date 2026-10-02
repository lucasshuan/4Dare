import { UserRound } from "lucide-react";
import type { Avatar as AvatarData } from "@/game/types";
import { cn } from "@/lib/cn";

const SIZE = {
  20: "size-5 text-[11px]",
  28: "size-7 text-[13px]",
  32: "size-8 text-sm",
  44: "size-11 text-lg",
  48: "size-12 text-xl",
} as const;

/** Initial on a pastel, a picture, or (guests) a person icon on a pastel. */
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
      {avatar.kind === "image" ? (
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
