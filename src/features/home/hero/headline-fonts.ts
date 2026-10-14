import { Black_Ops_One, Cabin_Sketch, Fredoka } from "next/font/google";
import type { GameKey } from "@/game/games";

// Each game's name in the hero's headline has its own letters: Who am I?
// round and bouncy, the Impostor a stencilled crate stamp, the Lineup chalk.
// Nothing preloads: the headline starts on the logo, and a name waits for
// its font before it shows (headline.tsx).
const fredoka = Fredoka({ weight: "700", subsets: ["latin"], preload: false });
const blackOps = Black_Ops_One({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
const cabinSketch = Cabin_Sketch({
  weight: "700",
  subsets: ["latin"],
  preload: false,
});

/** A game's headline font: its CSS family and the weight it is drawn in. */
export interface HeadlineFont {
  family: string;
  weight: number;
}

export const HEADLINE_FONTS: Record<GameKey, HeadlineFont> = {
  "who-am-i": { family: fredoka.style.fontFamily, weight: 700 },
  impostor: { family: blackOps.style.fontFamily, weight: 400 },
  lineup: { family: cabinSketch.style.fontFamily, weight: 700 },
};
