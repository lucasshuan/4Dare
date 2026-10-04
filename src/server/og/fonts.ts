import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";
import type { Lang } from "@/game/types";

// Fonts for the share images (satori takes ttf, not the woff2 next/font serves).
// Japanese gets its own font, cut to the characters the images draw (`pnpm og:font`),
// and it's only read for Japanese images. Each file is read through a literal path,
// so the build traces exactly these files into the image routes.

type Font = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>[number];

let latin: Promise<Font[]> | null = null;
let japanese: Promise<Font[]> | null = null;

export const FONT = {
  display: "Bricolage Grotesque",
  body: "Figtree",
  japanese: "Zen Maru Gothic",
} as const;

function loadLatin(): Promise<Font[]> {
  latin ??= Promise.all([
    readFile(
      join(process.cwd(), "assets/fonts/BricolageGrotesque-ExtraBold.ttf"),
    ),
    readFile(join(process.cwd(), "assets/fonts/Figtree-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Figtree-Bold.ttf")),
  ]).then(([display, body, bold]) => [
    { name: FONT.display, data: display, weight: 800, style: "normal" },
    { name: FONT.body, data: body, weight: 600, style: "normal" },
    { name: FONT.body, data: bold, weight: 700, style: "normal" },
  ]);
  return latin;
}

function loadJapanese(): Promise<Font[]> {
  japanese ??= readFile(
    join(process.cwd(), "assets/fonts/ZenMaruGothic-Bold-og.ttf"),
  ).then((data) => [
    { name: FONT.japanese, data, weight: 700, style: "normal" },
  ]);
  return japanese;
}

export async function ogFonts(lang: Lang): Promise<Font[]> {
  const fonts = await loadLatin();
  return lang === "ja" ? [...fonts, ...(await loadJapanese())] : fonts;
}
