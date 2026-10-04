"use client";

import dynamic from "next/dynamic";

// A separate chunk, so the font's CSS is linked only on the pages that render
// it (a Server Component importing it straight would not split it out).
const JaFont = dynamic(() => import("./ja-font"));

export function JaFontLoader() {
  return <JaFont />;
}
