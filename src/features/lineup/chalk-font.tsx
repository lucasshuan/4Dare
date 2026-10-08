"use client";

import { Cabin_Sketch, Caveat } from "next/font/google";

// The chalk (names, titles) and the handwriting (a board's free words). Their
// @font-face rules are this module's CSS: they load only on What for?'s
// screens, and not at all with "Plain letters" on.
const chalk = Cabin_Sketch({ weight: ["700"], preload: false });
const hand = Caveat({ weight: ["700"], preload: false });

/** Puts the chalk fonts under --font-chalk and --font-hand. */
export default function ChalkFont() {
  return (
    <style>{`:root{--lu-chalk:${chalk.style.fontFamily};--lu-hand:${hand.style.fontFamily}}`}</style>
  );
}
