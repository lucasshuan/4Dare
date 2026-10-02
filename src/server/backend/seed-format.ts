// Shape of data/characters/<lang>.json: the starter library shipped with the repo.
// Local mode searches these files in memory; `pnpm seed` loads them into Supabase.
export interface SeedCharacter {
  /** Stable id, unique across languages, e.g. "pt-wd-Q51746" or "ja-al-40". */
  id: string;
  name: string;
  /** Work or franchise ("Star Wars"), or a short descriptor for real people ("atriz"). */
  origin: string | null;
  /** Direct image URL, portrait-friendly, at least 300px wide when possible. */
  imageUrl: string | null;
  /** Other spellings and names in other languages (for matching guesses). */
  aliases: string[];
  /** Higher = more popular; used to rank search results. */
  popularity: number;
}
