import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appName } from "@/config";
import common from "../../../messages/ja/common.json";
import home from "../../../messages/ja/home.json";
import meta from "../../../messages/ja/meta.json";

// Every character the Japanese share images can draw: all of meta.json, the game's
// card texts, the answers, the app name and art.tsx's own text (read whole, comments
// too: a few extra glyphs cost less than a missed one). Not used by the app:
// scripts/og-font.ts cuts the font to these and fonts.test.ts checks the cut.

const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : value && typeof value === "object"
      ? Object.values(value).flatMap(strings)
      : [];

/** The characters, each once, without line breaks and other control characters. */
export function jaShareText(): string {
  const art = readFileSync(
    join(process.cwd(), "src/server/og/art.tsx"),
    "utf8",
  );
  const text = [
    ...strings(meta),
    ...strings(home.games.whoAmI),
    ...strings(home.games.impostor),
    ...strings(common.answers),
    appName("ja"),
    art,
  ].join("");
  return [...new Set(text)].filter((c) => c >= " ").join("");
}
