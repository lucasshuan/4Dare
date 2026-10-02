/** Key used to compare names: the app's own, so dedup agrees with search. */
export { normalizeName } from "../../src/game/match";

/** Trim, collapse spaces and drop a trailing "(disambiguator)". */
export function cleanName(value: string): string {
  return (
    value
      // zero-width spaces and joiners, byte-order marks (seen in vandalised labels)
      .replace(/[​-‍⁠﻿]/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*[(（][^()（）]*[)）]\s*$/u, "")
      .trim()
  );
}

const UTM = /[?&]utm_[^&]*/g;

/** Strip tracking parameters the Wikipedia API adds to thumbnail URLs. */
export function cleanImageUrl(url: string): string {
  const stripped = url.replace(UTM, "");
  return stripped.includes("?") || !stripped.includes("&")
    ? stripped
    : stripped.replace("&", "?");
}

/** Remove "universe"/"franchise" decorations from a work label. */
export function cleanWorkLabel(
  value: string,
  lang: "en" | "pt" | "ja",
): string {
  let out = cleanName(value);
  if (lang === "en") {
    out = out
      .replace(/^(the )?(fictional )?universe of /i, "")
      .replace(/\s+(fictional |narrative )?universe$/i, "")
      .replace(/\s+(media )?franchise$/i, "");
  } else if (lang === "pt") {
    out = out
      .replace(/^(o )?universo (ficcional )?(de |do |da |dos |das )?/i, "")
      .replace(/^franquia (de |do |da )?/i, "")
      .replace(/\s+\((franquia|universo)\)$/i, "");
  } else {
    out = out
      .replace(
        /(の)?(世界|宇宙|ユニバース|フランチャイズ|シリーズの世界)$/u,
        "",
      )
      .replace(/[・\s]+$/u, "");
  }
  return out.trim();
}

/** Upper-case first letter (for labels that Wikidata keeps lower case). */
export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u;

function textWidth(value: string): number {
  let width = 0;
  for (const char of value) width += WIDE.test(char) ? 2 : 1;
  return width;
}

/**
 * JSON.stringify with 2-space indentation and a trailing newline, keeping
 * short string arrays on one line the way Biome formats them.
 */
export function formatJson(value: unknown): string {
  const text = JSON.stringify(value, null, 2);
  const collapsed = text.replace(
    /^( *)("[^"\n]*": )\[\n((?: *"(?:[^"\\\n]|\\.)*",?\n)+) *\]/gm,
    (match, indent: string, key: string, body: string) => {
      const items = body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/,$/, ""));
      const single = `${indent}${key}[${items.join(", ")}]`;
      return textWidth(single) + 1 <= 80 ? single : match;
    },
  );
  return `${collapsed}\n`;
}
