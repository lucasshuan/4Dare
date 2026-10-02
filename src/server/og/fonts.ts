import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImageResponse } from "next/og";
import type { Lang } from "@/game/types";

// Fonts for the share images (satori takes ttf, not the woff2 next/font serves).
// Japanese gets its own font; it's big, so it's only read for Japanese images.

type Font = NonNullable<
  NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"]
>[number];

const read = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file));

let latin: Promise<Font[]> | null = null;
let japanese: Promise<Font[]> | null = null;

export const FONT = {
  display: "Bricolage Grotesque",
  body: "Figtree",
  japanese: "Zen Maru Gothic",
} as const;

function loadLatin(): Promise<Font[]> {
  latin ??= Promise.all([
    read("BricolageGrotesque-ExtraBold.ttf"),
    read("Figtree-SemiBold.ttf"),
    read("Figtree-Bold.ttf"),
  ]).then(([display, body, bold]) => [
    { name: FONT.display, data: display, weight: 800, style: "normal" },
    { name: FONT.body, data: body, weight: 600, style: "normal" },
    { name: FONT.body, data: bold, weight: 700, style: "normal" },
  ]);
  return latin;
}

function loadJapanese(): Promise<Font[]> {
  japanese ??= read("ZenMaruGothic-Bold.ttf").then((data) => [
    { name: FONT.japanese, data, weight: 700, style: "normal" },
  ]);
  return japanese;
}

export async function ogFonts(lang: Lang): Promise<Font[]> {
  const fonts = await loadLatin();
  return lang === "ja" ? [...fonts, ...(await loadJapanese())] : fonts;
}
