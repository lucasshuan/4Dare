// What a profile's owner chooses: the cover, the accent, the quote, the
// showcase, "about you" and who sees what. Kept as JSON on the profile row;
// read back through the parsers below, so a row from an older app (or a
// hand edit) can never break a page.
import { LANGS, type Lang } from "../types";

export const QUOTE_MAX = 80;
export const SHOWCASE_MAX = 3;
export const CAPTION_MAX = 60;

/**
 * The colours a cover and the accent take: the avatar's own (a deeper take on
 * its pastel) or one of the palette's. Each has a light and a dark value
 * (src/app/globals.css, --tint-*).
 */
export const TINTS = [
  "avatar",
  "sky",
  "teal",
  "apricot",
  "rose",
  "violet",
  "green",
  "gold",
  "slate",
] as const;
export type Tint = (typeof TINTS)[number];

/** The patterns drawn over a cover's colour (src/features/profile/cover-paint.tsx). */
export const PATTERNS = [
  "plain",
  "dots",
  "stripes",
  "checks",
  "waves",
  "zigzag",
  "stars",
  "questions",
] as const;
export type Pattern = (typeof PATTERNS)[number];

/** A pattern in a colour, or a picture the owner sent. Null: plain, in the avatar's colour. */
export type Banner =
  | { kind: "pattern"; pattern: Pattern; tint: Tint }
  | { kind: "image"; url: string };

/** A cover left as it came: plain, in the avatar's colour. */
export const DEFAULT_COVER = {
  pattern: "plain",
  tint: "avatar",
} as const satisfies {
  pattern: Pattern;
  tint: Tint;
};

// what the first covers and accents (hex colours) turn into
const OLD_PRESETS: Record<string, [Pattern, Tint]> = {
  dawn: ["plain", "apricot"],
  meadow: ["plain", "green"],
  sea: ["waves", "sky"],
  dusk: ["plain", "violet"],
  candy: ["stripes", "rose"],
  night: ["stars", "sky"],
};
const OLD_ACCENTS: Record<string, Tint> = {
  "#2B69C8": "sky",
  "#0B7A75": "teal",
  "#CF7024": "apricot",
  "#C2417A": "rose",
  "#7A5AF5": "violet",
  "#3F9A3A": "green",
  "#B8860B": "gold",
  "#566075": "slate",
};

/** A character on the showcase (language-free id: "wd-Q302", "u-…") and what the owner says of it. */
export interface ShowcaseItem {
  characterId: string;
  caption: string;
}

export const PLAY_TIMES = ["morning", "afternoon", "night", "dawn"] as const;
export type PlayTime = (typeof PLAY_TIMES)[number];

/** "About you": both empty until the owner fills them, and empty shows nothing. */
export interface About {
  time: PlayTime | null;
  langs: Lang[];
}

/** Who sees a part of a profile. "friends" comes later: until then it reads as "me". */
export const AUDIENCES = ["all", "played", "friends", "me"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const PRIVACY_KEYS = [
  "profile",
  "mural",
  "muralWrite",
  "muralReply",
  "activity",
  "showcase",
  "contributions",
] as const;
export type PrivacyKey = (typeof PRIVACY_KEYS)[number];

export type Privacy = Record<PrivacyKey, Audience> & {
  /** "Playing now" on the profile and the card. */
  playing: boolean;
};

/** Everything open: a new profile shows it all. */
export const DEFAULT_PRIVACY: Privacy = {
  profile: "all",
  mural: "all",
  muralWrite: "all",
  muralReply: "all",
  activity: "all",
  showcase: "all",
  contributions: "all",
  playing: true,
};

const record = (raw: unknown): Record<string, unknown> | null =>
  raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;

const oneOf = <T extends string>(list: readonly T[], v: unknown): T | null =>
  typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : null;

export function parseBanner(raw: unknown): Banner | null {
  const r = record(raw);
  if (!r) return null;
  if (r.kind === "pattern") {
    const pattern = oneOf(PATTERNS, r.pattern);
    const tint = oneOf(TINTS, r.tint);
    return pattern && tint ? { kind: "pattern", pattern, tint } : null;
  }
  if (r.kind === "preset" && typeof r.id === "string" && OLD_PRESETS[r.id]) {
    const [pattern, tint] = OLD_PRESETS[r.id];
    return { kind: "pattern", pattern, tint };
  }
  if (r.kind === "image" && typeof r.url === "string" && r.url)
    return { kind: "image", url: r.url };
  return null;
}

/** A palette colour, or null (the default, sky). */
export const parseAccent = (raw: unknown): Tint | null =>
  oneOf(TINTS, raw) ??
  (typeof raw === "string" ? (OLD_ACCENTS[raw.toUpperCase()] ?? null) : null);

/** Up to three different characters, captions trimmed to the limit. */
export function parseShowcase(raw: unknown): ShowcaseItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ShowcaseItem[] = [];
  for (const item of raw) {
    const r = record(item);
    const id = typeof r?.characterId === "string" ? r.characterId.trim() : "";
    if (!id || id.length > 200 || out.some((o) => o.characterId === id))
      continue;
    const caption =
      typeof r?.caption === "string"
        ? r.caption.replace(/\s+/g, " ").trim().slice(0, CAPTION_MAX)
        : "";
    out.push({ characterId: id, caption });
    if (out.length === SHOWCASE_MAX) break;
  }
  return out;
}

export function parseAbout(raw: unknown): About {
  const r = record(raw);
  const langs = Array.isArray(r?.langs)
    ? LANGS.filter((l) => (r.langs as unknown[]).includes(l))
    : [];
  return { time: oneOf(PLAY_TIMES, r?.time), langs };
}

export function parsePrivacy(raw: unknown): Privacy {
  const r = record(raw) ?? {};
  const out = { ...DEFAULT_PRIVACY };
  for (const key of PRIVACY_KEYS)
    out[key] = oneOf(AUDIENCES, r[key]) ?? out[key];
  if (typeof r.playing === "boolean") out.playing = r.playing;
  return out;
}

/** Whether a reader sees a part kept for `audience`: its owner always does. */
export function sees(
  audience: Audience,
  reader: { isOwner: boolean; playedWith: boolean },
): boolean {
  if (reader.isOwner) return true;
  if (audience === "all") return true;
  if (audience === "played") return reader.playedWith;
  return false;
}

/** A quote as kept: one line, trimmed, at most QUOTE_MAX characters; empty is none. */
export function cleanQuote(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const q = raw.replace(/\s+/g, " ").trim().slice(0, QUOTE_MAX);
  return q || null;
}
