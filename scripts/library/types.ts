export type { SeedCharacter } from "../../src/server/backend/seed-format";

export const LANGS = ["en", "pt", "ja"] as const;
export type Lang = (typeof LANGS)[number];

export type ByLang<T> = Partial<Record<Lang, T>>;

/** A Wikidata item that may end up in the library. */
export interface Entity {
  qid: string;
  kind: "fictional" | "human";
  sitelinks: number;
  labels: ByLang<string>;
  /** Wikipedia article titles in en/pt/ja. */
  titles: ByLang<string>;
  /** Commons file name from P18. */
  p18?: string;
  anilistId?: number;
  /** Has P279 (subclass of): a type such as "elf", not an individual. */
  isClass: boolean;
  female: boolean;
  /** Which pool queries found it (occupation group, root class, country). */
  pools: Set<string>;
}

export interface Work {
  prop: string;
  qid: string;
  sitelinks: number;
  labels: ByLang<string>;
}

export interface Details {
  aliases: ByLang<string[]>;
  descriptions: ByLang<string>;
  occupations: string[];
  /** Labels of occupations without a descriptor, by language. */
  occupationLabels: ByLang<string[]>;
  works: Work[];
  classes: string[];
}

export interface AniListCharacter {
  id: number;
  full: string | null;
  native: string | null;
  alternative: string[];
  image: string | null;
  favourites: number;
  gender: string | null;
  media: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  } | null;
}
