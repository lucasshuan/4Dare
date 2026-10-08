"use client";

import { Yomogi } from "next/font/google";

// Japanese has no chalk in Cabin Sketch or Caveat: Yomogi, a light handwriting,
// for both. Loaded on Japanese pages only.
const yomogi = Yomogi({ weight: "400", preload: false });

export default function ChalkFontJa() {
  return (
    <style>{`:root{--lu-chalk:${yomogi.style.fontFamily};--lu-hand:${yomogi.style.fontFamily}}`}</style>
  );
}
