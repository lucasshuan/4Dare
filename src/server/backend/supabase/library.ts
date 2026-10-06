import "server-only";
import { type SearchItem, toSearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";
import { entryId } from "../seed-format";
import { type Db, serviceClient } from "./clients";

/** A library row of the character_entries view, as the index needs it. */
export interface LibraryRow {
  character_id: string;
  name: string;
  origin: string | null;
  image_url: string | null;
  /** The language's aliases, as written. */
  aliases: string[] | null;
  /** The names in the other languages, as written. */
  other_names: string[] | null;
}

const COLUMNS = "character_id, name, origin, image_url, aliases, other_names";
/** Rows asked for per request; PostgREST may hand out fewer (its "max rows"). */
const PAGE = 1000;
const TTL = 60 * 60_000;

/** The same item the starter files give: the language's aliases, then the other languages' names. */
export const toLibraryItem = (lang: Lang, r: LibraryRow): SearchItem =>
  toSearchItem({
    id: entryId(lang, r.character_id),
    name: r.name,
    origin: r.origin,
    imageUrl: r.image_url,
    aliases: [...(r.aliases ?? []), ...(r.other_names ?? [])],
  });

/**
 * One language's library, most popular first, a page at a time: every
 * character, the ones the language doesn't rank last, less those `shadowed`
 * by a ranked one of the same name and category (the same character under
 * another id). The id breaks popularity ties, so pages never skip or repeat a row. Each page starts where
 * the rows so far end and only an empty one ends the read, so a server that
 * caps pages below PAGE still gives the whole library.
 */
export async function readLibrary(db: Db, lang: Lang): Promise<SearchItem[]> {
  const items: SearchItem[] = [];
  for (;;) {
    const from = items.length;
    const { data, error } = await db
      .from("character_entries")
      .select(COLUMNS)
      .eq("lang", lang)
      .eq("shadowed", false)
      .not("character_id", "like", "u-%")
      .order("popularity", { ascending: false, nullsFirst: false })
      .order("character_id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as LibraryRow[];
    if (rows.length === 0) return items;
    for (const row of rows) items.push(toLibraryItem(lang, row));
  }
}

/**
 * The library index per language, read at most once an hour per server
 * instance. Requests that arrive during a read share it. A failed read is
 * not kept: the last index stays in use and the next request tries again.
 */
export function supabaseLibrary(db: () => Db = serviceClient, ttl = TTL) {
  const cache = new Map<Lang, { at: number; items: SearchItem[] }>();
  const loading = new Map<Lang, Promise<SearchItem[]>>();
  return (lang: Lang): Promise<SearchItem[]> => {
    const cached = cache.get(lang);
    if (cached && Date.now() - cached.at < ttl)
      return Promise.resolve(cached.items);
    let load = loading.get(lang);
    if (!load) {
      load = readLibrary(db(), lang)
        .then((items) => {
          cache.set(lang, { at: Date.now(), items });
          return items;
        })
        .catch((error: unknown) => {
          const old = cache.get(lang);
          if (old) return old.items;
          throw error;
        })
        .finally(() => loading.delete(lang));
      loading.set(lang, load);
    }
    return load;
  };
}
