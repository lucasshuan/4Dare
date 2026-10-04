// Cuts the Japanese share-image font down to the characters the images can draw, so the
// image routes ship a small file instead of the whole 3.8 MB font.
//
//   pnpm og:font
//
// Reads scripts/fonts/ZenMaruGothic-Bold.ttf, writes assets/fonts/ZenMaruGothic-Bold-og.ttf.
// Run it again when src/server/og/fonts.test.ts says a share-image text has a character
// the cut lacks, and commit the new file.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import subsetFont from "subset-font";
import { jaShareText } from "../src/server/og/ja-text";

const FULL = "scripts/fonts/ZenMaruGothic-Bold.ttf";
const CUT = "assets/fonts/ZenMaruGothic-Bold-og.ttf";

/** Whole blocks on top of the texts, so a small wording edit rarely needs a new cut. */
const BLOCKS: [from: number, to: number][] = [
  [0x0020, 0x007e], // printable ASCII
  [0x3000, 0x303f], // CJK punctuation
  [0x3041, 0x3096], // hiragana
  [0x30a1, 0x30fc], // katakana, with ・ and ー
];

const blockText = BLOCKS.flatMap(([from, to]) =>
  Array.from({ length: to - from + 1 }, (_, i) =>
    String.fromCodePoint(from + i),
  ),
).join("");

async function main() {
  const full = readFileSync(join(process.cwd(), FULL));
  const texts = jaShareText();
  const cut = await subsetFont(full, `${blockText}${texts}`, {
    targetFormat: "truetype",
  });
  writeFileSync(join(process.cwd(), CUT), cut);

  // harfbuzzjs is ESM with top-level await, so it can't be required.
  const { Blob, Face } = await import("harfbuzzjs");
  const has = (font: Buffer) =>
    new Set(new Face(new Blob(font)).collectUnicodes());
  const inFull = has(full);
  const inCut = has(cut);
  const lacking = [...texts].filter((c) => !inFull.has(c.codePointAt(0) ?? 0));
  console.log(
    `${CUT}: ${inCut.size} characters, ${(cut.length / 1024).toFixed(1)} KB (full font ${(full.length / 1024 / 1024).toFixed(2)} MB)`,
  );
  if (lacking.length) {
    console.warn(
      `The full font has no glyph for ${lacking.join(" ")}: the images can't draw them in Japanese.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
