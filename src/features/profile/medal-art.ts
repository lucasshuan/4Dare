// A badge's medal, as the profile and a match's end draw it: its icon, its
// tier's metal and its hexagon.
import {
  Camera,
  Coins,
  Compass,
  Flame,
  Gamepad2,
  ImageUp,
  Laugh,
  type LucideIcon,
  Medal,
  Search,
  Shapes,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Trophy,
  Tv,
  UserRoundPlus,
  Users,
  VenetianMask,
  Zap,
} from "lucide-react";
import type { BadgeId } from "@/game/profile/badges";

export const BADGE_ICON: Record<BadgeId, LucideIcon> = {
  matches: Gamepad2,
  wins: Trophy,
  streak: Flame,
  people: Users,
  discovered: Sparkles,
  quick: Zap,
  themes: Compass,
  tough: ShieldCheck,
  pokerFace: VenetianMask,
  nose: Search,
  chameleon: Shapes,
  bullseye: Target,
  coach: Medal,
  bargain: Tag,
  allIn: Coins,
  stage: Laugh,
  booth: Tv,
  pictures: Camera,
  covers: ImageUp,
  characters: UserRoundPlus,
};

/** Each tier's metal: the medal's top and base, and the rim and ribbon. */
export const METAL = {
  bronze: { top: "#e3a878", base: "#b8733f", rim: "#7a431d" },
  silver: { top: "#d3dae5", base: "#8f9bb0", rim: "#535e75" },
  gold: { top: "#f7d97c", base: "#d6a11c", rim: "#8a650a" },
} as const;

/** The medal's hexagon and its lighter inner face, in a 48 × 54 box. */
export const HEX = "M24 4 41.32 14V34L24 44 6.68 34V14Z";
export const HEX_INNER = "M24 9.5 36.55 16.75V31.25L24 38.5 11.45 31.25V16.75Z";

/** A goal on the ribbon: 1.2K past a thousand. */
export const short = (n: number) =>
  n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n);
