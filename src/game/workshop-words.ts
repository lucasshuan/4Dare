// What the Workshop's live check knows about words, per language: the little
// ones it skips when it compares two texts, and the ones a suggestion can't
// carry. Lists only, no AI. Folded like normalizeName's words (lower case,
// no accents).
import type { Lang } from "./types";

/** Skipped when two texts are compared. */
export const STOP_WORDS: Record<Lang, readonly string[]> = {
  pt: "personagens personagem de da do das dos e com que a o os as em um uma no na nos nas ele ela quao se por para pra ou seu sua".split(
    " ",
  ),
  en: "characters character the a an of and with who that in on to how is are his her their or for".split(
    " ",
  ),
  es: "personajes personaje de del la el los las y con que en un una se por para o su sus como".split(
    " ",
  ),
  ja: ["キャラクター", "の", "が", "は", "を", "に", "と", "で", "も"],
};

/** Never in a suggestion: slurs and sexual words, in every language's own list. */
export const BLOCKED_WORDS: Record<Lang, readonly string[]> = {
  pt: [
    "porra",
    "caralho",
    "buceta",
    "puta",
    "viado",
    "crioulo",
    "retardado",
    "estupro",
    "estuprar",
    "piroca",
    "foder",
    "fodase",
    "pedofilo",
  ],
  en: [
    "fuck",
    "fucking",
    "cunt",
    "nigger",
    "nigga",
    "faggot",
    "retard",
    "rape",
    "rapist",
    "whore",
    "slut",
    "pedophile",
    "porn",
    "pussy",
  ],
  es: [
    "puta",
    "puto",
    "joder",
    "coño",
    "maricon",
    "mierda",
    "violar",
    "violacion",
    "pendejo",
    "verga",
    "pedofilo",
    "negrata",
  ],
  ja: ["死ね", "ちんこ", "まんこ", "セックス", "レイプ", "キチガイ", "ガイジ"],
};
