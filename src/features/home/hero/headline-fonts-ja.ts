import { Hachi_Maru_Pop, Mochiy_Pop_One, Stick } from "next/font/google";
import type { GameKey } from "@/game/games";
import type { HeadlineFont } from "./headline-fonts";

// Japanese gets its own headline letters: a fat pop round, a stencil made of
// sticks, a round hand like chalk. Loaded on Japanese pages only.
const pop = Mochiy_Pop_One({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});
const stick = Stick({ weight: "400", subsets: ["latin"], preload: false });
const hand = Hachi_Maru_Pop({
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

export const HEADLINE_FONTS_JA: Record<GameKey, HeadlineFont> = {
  "who-am-i": { family: pop.style.fontFamily, weight: 400 },
  impostor: { family: stick.style.fontFamily, weight: 400 },
  lineup: { family: hand.style.fontFamily, weight: 400 },
};
