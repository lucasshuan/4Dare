// What the three title scenes share: the players they draw, the seat colours
// as the scenes paint them (fixed, the same in both themes, like the sets
// they stand on), and an avatar's picture.
import type { Avatar } from "@/game/types";
import { avatarUri } from "@/lib/avatar";

/** A player as a title scene draws them. */
export interface TitlePlayer {
  id: string;
  /** As the viewer reads it. */
  name: string;
  avatar: Avatar;
  /** Their colour slot in the room (0-based). */
  slot: number;
  /** Won this game's last match here: the crown. */
  crowned: boolean;
}

/** What every title scene is drawn from. */
export interface TitleProps {
  players: TitlePlayer[];
  /** This game's match number in the room. */
  n: number;
  /** The long scene (the game's first match here, or a newcomer's); short when the group plays again. */
  first: boolean;
  /** Drawn for a phone held upright (780×1688) instead of a landscape screen (1280×720). */
  portrait: boolean;
}

/** --seat-1..10 of the light theme: the seat colours on the sets. */
const SEAT = [
  "#2b69c8",
  "#cf7024",
  "#0b7a75",
  "#8a4fc4",
  "#c03d8a",
  "#3d8b47",
  "#b38600",
  "#1590a8",
  "#9b5a1f",
  "#6b4fd6",
] as const;
/** The dark theme's: the same colours lit, for glows and highlights. */
const LIT = [
  "#86b4f7",
  "#f0a566",
  "#5ccfc6",
  "#c39bf2",
  "#f08cc8",
  "#7fd08a",
  "#e3c04f",
  "#5fc6e0",
  "#d39a63",
  "#a99bf7",
] as const;
/** Deeper, for names on white. */
const INK = [
  "#163e7b",
  "#7f4312",
  "#044946",
  "#532e78",
  "#762253",
  "#225428",
  "#6e5100",
  "#085767",
  "#5e350f",
  "#3f2e84",
] as const;

const at = <T>(list: readonly T[], slot: number) =>
  list[((slot % list.length) + list.length) % list.length];

export const seatOf = (slot: number) => at(SEAT, slot);
export const litOf = (slot: number) => at(LIT, slot);
export const inkOf = (slot: number) => at(INK, slot);

/** An avatar's picture for an <img>, at full detail. */
export const avatarSrc = (avatar: Avatar) =>
  avatar.kind === "creature" ? avatarUri(avatar.dna, 128) : avatar.url;

/** A colour between `a` and `b` ("#rrggbb"), `t` of the way. */
export function mix(a: string, b: string, t: number) {
  const x = rgb(a);
  const y = rgb(b);
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
const rgb = (h: string) => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(s.slice(i, i + 2), 16));
};

/** A number in [0, 1) from `k`, the same everywhere. */
export function rnd(k: number) {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
