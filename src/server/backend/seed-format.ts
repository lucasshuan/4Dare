// Shape of the starter library shipped with the repo: data/characters.json (one
// entry per character, every language inside) and data/origins.json (the works
// and descriptors characters come from, translated). Local mode searches these
// files in memory; `pnpm seed` loads them into Supabase.
import type { Category } from "../../game/categories";
import { normalizeName } from "../../game/match";
import { type Character, LANGS, type Lang } from "../../game/types";

export type ByLang<T> = Partial<Record<Lang, T>>;

export interface SeedCharacter {
  /**
   * Stable id: "wd-Q302" (Wikidata), "al-40" (AniList) or "hand-fox-mccloud"
   * (added by hand, for characters neither source gave).
   */
  id: string;
  kind: "fictional" | "human";
  category: Category;
  /** Key into data/origins.json ("wd:Q8337", "job:footballer"), or null. */
  origin: string | null;
  /** Direct image URL, portrait-friendly, at least 300px wide when possible. */
  imageUrl: string | null;
  /** The name in each language it is known by. */
  names: ByLang<string>;
  /** Other names and spellings per language (for matching guesses). */
  aliases: ByLang<string[]>;
  /**
   * Higher = more popular, per language; only the languages that rank the
   * character. Orders search results: every language searches every
   * character, the unranked ones last.
   */
  popularity: ByLang<number>;
}

export interface SeedOrigin {
  /**
   * "wd:Q8337" a Wikidata work, "al:21" an AniList title, "job:actor" or
   * "job:actor:f" a descriptor for real people, "group:band", or "topic:bible"
   * for hand-picked origins.
   */
  id: string;
  /** Missing languages fall back to English. */
  labels: ByLang<string>;
}

/** An origin's label in `lang`, falling back to English. */
export function originLabel(origin: SeedOrigin | undefined, lang: Lang) {
  return origin ? (origin.labels[lang] ?? origin.labels.en ?? null) : null;
}

/** App-facing id of a library character in one language: "pt-wd-Q302". */
export const entryId = (lang: Lang, id: string) => `${lang}-${id}`;

/** The library id and language behind an app-facing id, or null for others. */
export function parseEntryId(id: string): { lang: Lang; id: string } | null {
  const match =
    /^(en|es|ja|pt)-((?:wd-Q|al-)\d+|hand-[a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(id);
  return match ? { lang: match[1] as Lang, id: match[2] } : null;
}

/** Its name in `lang`, else its English one (what the database copies, 0029). */
const entryName = (c: SeedCharacter, lang: Lang) =>
  c.names[lang] ?? c.names.en ?? "";

/**
 * Its names in the other languages, as aliases: a player may guess
 * "Spider-Man" in a Portuguese room.
 */
export function entryAliases(c: SeedCharacter, lang: Lang): string[] {
  const own = entryName(c, lang);
  const seen = new Set([normalizeName(own)]);
  const out: string[] = [];
  const others = LANGS.filter((l) => l !== lang).map((l) => c.names[l]);
  for (const alias of [...(c.aliases[lang] ?? []), ...others]) {
    const key = alias ? normalizeName(alias) : "";
    if (!alias || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(alias);
  }
  return out;
}

/**
 * One language's library as app characters with their popularity, most
 * popular first: the whole library, the ones `lang` doesn't rank last (at 0).
 */
export function libraryFor(
  characters: SeedCharacter[],
  origins: SeedOrigin[],
  lang: Lang,
): { character: Character; popularity: number }[] {
  const byId = new Map(origins.map((o) => [o.id, o]));
  return characters
    .flatMap((c) => {
      const popularity = c.popularity[lang] ?? 0;
      const name = entryName(c, lang);
      if (!name) return [];
      const origin = c.origin ? byId.get(c.origin) : undefined;
      const character: Character = {
        id: entryId(lang, c.id),
        lang,
        name,
        origin: originLabel(origin, lang),
        imageUrl: c.imageUrl,
        aliases: entryAliases(c, lang),
      };
      return [{ character, popularity }];
    })
    .sort((a, b) => b.popularity - a.popularity);
}
