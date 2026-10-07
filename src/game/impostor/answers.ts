// The answers an Impostor question offers, shared by the engine (to check
// them) and the screens (to draw them). Scales and picks take their words
// from the question bank; colours and emoji palettes live here.
import { normalizeName } from "../match";
import type { Character } from "../types";
import type { ImpAnswer, ImpQuestion, QuestionKind } from "./types";

/** A scale goes from 1 to this. */
export const SCALE_MAX = 10;
/** The longest word answer. */
export const WORD_MAX = 20;

/** The twelve colours, in the order they are offered; names in messages (impostor.colors). */
export const COLORS = [
  { key: "red", hex: "#d6332b" },
  { key: "orange", hex: "#f08a24" },
  { key: "yellow", hex: "#f6c453" },
  { key: "green", hex: "#2f8f5b" },
  { key: "lime", hex: "#9ccf5a" },
  { key: "sky", hex: "#6fb1ea" },
  { key: "blue", hex: "#2b69c8" },
  { key: "purple", hex: "#8a4fc4" },
  { key: "pink", hex: "#ec96b2" },
  { key: "brown", hex: "#8a5a3b" },
  { key: "black", hex: "#1e2433" },
  { key: "white", hex: "#f4f6fa" },
] as const;

/** Emoji palettes a question names (its `palette`), twelve each. */
export const EMOJI_PALETTES = {
  general: [
    "😂",
    "😎",
    "🔥",
    "💪",
    "😱",
    "🥺",
    "😴",
    "🤔",
    "😡",
    "🥳",
    "💀",
    "❤️",
  ],
  faces: [
    "😭",
    "😡",
    "😱",
    "😐",
    "🙃",
    "🤬",
    "😅",
    "🫠",
    "😤",
    "🤯",
    "😶",
    "🙏",
  ],
  animals: [
    "🐶",
    "🐱",
    "🐍",
    "🦜",
    "🐢",
    "🐟",
    "🐰",
    "🦎",
    "🐷",
    "🦉",
    "🐴",
    "🕷️",
  ],
  weather: ["☀️", "🌧️", "⛈️", "❄️", "🌫️", "🌈", "🌪️", "🌙", "🔥", "🌊", "🍂", "🌸"],
  places: ["🏖️", "🏔️", "🏙️", "🏝️", "🏰", "🌋", "🏜️", "🌲", "🚀", "🏕️", "🗼", "🏠"],
  objects: [
    "🗡️",
    "📱",
    "📚",
    "🎸",
    "🔦",
    "🧭",
    "🪓",
    "🎮",
    "💎",
    "🧸",
    "🪞",
    "🔑",
  ],
  sports: ["⚽", "🏀", "🎾", "🏈", "🥊", "🏊", "🚴", "⛷️", "🏎️", "🤺", "🏄", "♟️"],
  foods: [
    "🍕",
    "🍔",
    "🍣",
    "🍜",
    "🥗",
    "🍩",
    "🌮",
    "🍙",
    "🥩",
    "🍎",
    "🧀",
    "🍫",
  ],
} as const;
export type EmojiPalette = keyof typeof EMOJI_PALETTES;
export const isPalette = (v: unknown): v is EmojiPalette =>
  typeof v === "string" && v in EMOJI_PALETTES;

/** How many answers a question of `kind` offers: picks say theirs (2 to 4), words none. */
export function choicesOf(kind: QuestionKind, pickChoices = 2): number {
  switch (kind) {
    case "scale":
      return SCALE_MAX;
    case "color":
      return COLORS.length;
    case "emoji":
      return 12;
    case "pick":
      return pickChoices;
    case "word":
      return 0;
  }
}

/** Squashed, so "  Onigiri " and "onigiri" are the same answer. */
export const cleanWord = (w: string) => w.trim().replace(/\s+/g, " ");

/** The answer as the engine keeps it, or null when it doesn't fit the question. */
export function validAnswer(q: ImpQuestion, a: unknown): ImpAnswer | null {
  if (!a || typeof a !== "object") return null;
  if (q.kind === "word") {
    const w = (a as { word?: unknown }).word;
    if (typeof w !== "string") return null;
    const word = cleanWord(w);
    return word && [...word].length <= WORD_MAX ? { word } : null;
  }
  const n = (a as { n?: unknown }).n;
  if (typeof n !== "number" || !Number.isInteger(n)) return null;
  if (q.kind === "scale") return n >= 1 && n <= SCALE_MAX ? { n } : null;
  return n >= 0 && n < q.choices ? { n } : null;
}

/**
 * A word that names the card: the character, a nickname, its work, or a
 * piece of one of them (a first or last name of four letters or more).
 */
export function givesAway(word: string, card: Character): boolean {
  const words = (text: string) =>
    text.split(/\s+/).map(normalizeName).filter(Boolean);
  const said = normalizeName(word);
  if (!said) return false;
  const saidWords = words(word);
  const names = [
    card.name,
    ...card.aliases,
    ...(card.origin ? [card.origin] : []),
  ];
  return names.some((name) => {
    const n = normalizeName(name);
    if (n && (said === n || (n.length >= 4 && said.includes(n)))) return true;
    return words(name).some((p) => p.length >= 4 && saidWords.includes(p));
  });
}

/** Two answers the same (for words, after squashing case and accents). */
export function sameAnswer(a: ImpAnswer, b: ImpAnswer): boolean {
  if ("n" in a && "n" in b) return a.n === b.n;
  if ("word" in a && "word" in b)
    return normalizeName(a.word) === normalizeName(b.word);
  return false;
}
