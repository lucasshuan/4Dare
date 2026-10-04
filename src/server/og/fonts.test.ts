import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Blob, Face } from "harfbuzzjs";
import { describe, expect, it } from "vitest";
import { jaShareText } from "./ja-text";

// The Japanese share images use a cut of Zen Maru Gothic. A character missing from
// the cut would be drawn in another font, or as an empty box.

describe("Japanese share-image font", () => {
  it("has every character the images can draw", () => {
    const font = readFileSync(
      join(process.cwd(), "assets/fonts/ZenMaruGothic-Bold-og.ttf"),
    );
    const has = new Set(new Face(new Blob(font)).collectUnicodes());
    const missing = [...jaShareText()].filter(
      (c) => !has.has(c.codePointAt(0) ?? 0),
    );
    expect(
      missing,
      "a share-image text uses characters the Japanese font cut lacks: run `pnpm og:font` and commit assets/fonts/ZenMaruGothic-Bold-og.ttf",
    ).toEqual([]);
  });
});
