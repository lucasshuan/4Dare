"use client";

import { Oswald, Source_Serif_4, UnifrakturMaguntia } from "next/font/google";

// The newspaper's type at What for?'s end: the blackletter masthead, the
// condensed headlines and the serif body. Their @font-face rules are this
// module's CSS: they load only with the end scene.
const gothic = UnifrakturMaguntia({ weight: "400", preload: false });
const cond = Oswald({ preload: false });
const serif = Source_Serif_4({ style: ["normal", "italic"], preload: false });

/** Fetches the newspaper's fonts ahead of the end scene. */
export function loadPaperFonts(): Promise<unknown> {
  const faces = [
    `400 1em ${gothic.style.fontFamily}`,
    `700 1em ${cond.style.fontFamily}`,
    `400 1em ${serif.style.fontFamily}`,
    `italic 500 1em ${serif.style.fontFamily}`,
  ];
  // a face missing (the fallback's local font) only means it isn't loaded early
  return Promise.all(
    faces.map((face) => document.fonts.load(face).catch(() => {})),
  );
}

/** Puts the newspaper's fonts under --paper-gothic, --paper-cond and --paper-serif. */
export default function PaperFont() {
  return (
    <style>{`:root{--paper-gothic:${gothic.style.fontFamily};--paper-cond:${cond.style.fontFamily};--paper-serif:${serif.style.fontFamily}}`}</style>
  );
}
