"use client";

import { Cabin_Sketch, Caveat } from "next/font/google";

// The chalk (names, titles) and the handwriting (a board's free words). Their
// @font-face rules are this module's CSS: they load only on What for?'s
// screens, and not at all with "Plain letters" on.
const chalk = Cabin_Sketch({ weight: ["700"], preload: false });
const hand = Caveat({ weight: ["700"], preload: false });

/** Fetches the chalk fonts ahead of a screen that writes with them (the title scene). */
export function loadChalkFonts(): Promise<unknown> {
  // a face missing (the fallback's local font) only means it isn't loaded early
  return Promise.all(
    [chalk, hand].map((font) =>
      document.fonts.load(`700 1em ${font.style.fontFamily}`).catch(() => {}),
    ),
  );
}

/** Puts the chalk fonts under --font-chalk and --font-hand. */
export default function ChalkFont() {
  return (
    <style>{`:root{--lu-chalk:${chalk.style.fontFamily};--lu-hand:${hand.style.fontFamily}}`}</style>
  );
}
