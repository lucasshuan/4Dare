import type { CSSProperties } from "react";
import type { Avatar } from "@/game/types";
import { avatarUri } from "@/lib/avatar";

/** The picture of an avatar: its creature drawn at `size`, or its photo. */
export const avatarSrc = (avatar: Avatar, size = 68) =>
  avatar.kind === "creature" ? avatarUri(avatar.dna, size) : avatar.url;

/**
 * A player's face on its pastel, unstyled: the caller's class sizes it and
 * rings it (the home's and game pages' rooms, crowds and dialogs). The
 * Avatar component is the sized, ringed one the rest of the site uses.
 */
export function Face({
  avatar,
  className,
  style,
  size = 68,
}: {
  avatar: Avatar;
  className?: string;
  style?: CSSProperties;
  /** The drawing's resolution (px); the box comes from `className`. */
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{ ...style, ["--c" as string]: avatar.color }}
    >
      {/* biome-ignore lint/performance/noImgElement: generated svg data uri or a player's photo */}
      <img src={avatarSrc(avatar, size)} alt="" draggable={false} />
    </span>
  );
}
