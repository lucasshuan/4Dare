"use client";

import { Yomogi } from "next/font/google";

// Japanese has no chalk in Cabin Sketch or Caveat: Yomogi, a light handwriting,
// for both. Loaded on Japanese pages only.
const yomogi = Yomogi({ weight: "400", preload: false });

/** Fetches the font ahead of a screen that writes with it (the title scene). */
export function loadChalkFonts() {
  // a face missing (the fallback's local font) only means it isn't loaded early
  document.fonts.load(`400 1em ${yomogi.style.fontFamily}`).catch(() => {});
}

export default function ChalkFontJa() {
  return (
    <style>{`:root{--lu-chalk:${yomogi.style.fontFamily};--lu-hand:${yomogi.style.fontFamily}}`}</style>
  );
}
