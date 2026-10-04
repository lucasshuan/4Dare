"use client";

import { Zen_Maru_Gothic } from "next/font/google";

// Its @font-face rules (245 of them, one per slice of the Japanese glyphs) are
// this module's CSS, so they load only where it renders: Japanese pages.
const zenMaru = Zen_Maru_Gothic({ weight: ["500", "700"], preload: false });

/** Puts Zen Maru Gothic behind the Latin fonts, for the Japanese text. */
export default function JaFont() {
  return <style>{`:root{--font-zen-maru:${zenMaru.style.fontFamily}}`}</style>;
}
