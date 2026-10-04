import "server-only";
import { randomUUID } from "node:crypto";
import { SUPABASE_URL } from "@/config";
import { normalizeName } from "@/game/match";
import type { Character, Lang } from "@/game/types";
import { entryId, parseEntryId } from "../seed-format";
import type { CharacterStore, NewCharacter } from "../types";
import { serviceClient } from "./clients";
import { supabaseStarters } from "./themes";

/** A row of the character_entries view: a character as one language sees it. */
interface Row {
  character_id: string;
  lang: Lang;
  name: string;
  origin: string | null;
  image_url: string | null;
  aliases: string[] | null;
}

const COLUMNS = "character_id, lang, name, origin, image_url, aliases";

// Library characters live once in the database but once per language in the
// app ("pt-wd-Q302"); characters players made keep their own id.
const toCharacter = (r: Row): Character => ({
  id: r.character_id.startsWith("u-")
    ? r.character_id
    : entryId(r.lang, r.character_id),
  lang: r.lang,
  name: r.name,
  origin: r.origin,
  imageUrl: r.image_url,
  aliases: r.aliases ?? [],
});

export function supabaseCharacters(): CharacterStore {
  const db = () => serviceClient();
  const starters = supabaseStarters();
  const entry = async (id: string) => {
    const library = parseEntryId(id);
    let query = db()
      .from("character_entries")
      .select(COLUMNS)
      .eq("character_id", library?.id ?? id);
    if (library) query = query.eq("lang", library.lang);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data ? toCharacter(data as Row) : null;
  };
  /**
   * A character with an id fixed in advance (a pick draft's): requests racing
   * to make it all end with the same single row. Insert-or-nothing, never an
   * update, so a row already there stays exactly as it is.
   */
  const createOnce = async (id: string, input: NewCharacter) => {
    const known = await entry(id);
    if (known) return known;
    const made = await db().from("characters").upsert(
      {
        id,
        custom_origin: input.origin,
        image_url: input.imageUrl,
        created_by: input.createdBy,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (made.error) throw made.error;
    const named = await db()
      .from("character_names")
      .upsert(
        {
          character_id: id,
          lang: input.lang,
          name: input.name,
          norm: normalizeName(input.name),
          popularity: 0,
        },
        { onConflict: "character_id,lang", ignoreDuplicates: true },
      );
    if (named.error) throw named.error;
    return (
      (await entry(id)) ?? {
        id,
        lang: input.lang,
        name: input.name,
        origin: input.origin,
        imageUrl: input.imageUrl,
        aliases: [],
      }
    );
  };
  return {
    async search(query, lang, limit) {
      const { data, error } = await db().rpc("search_characters", {
        q: normalizeName(query),
        p_lang: lang,
        p_limit: limit,
      });
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toCharacter);
    },
    get: entry,
    async getMany(ids, lang) {
      const keys = [...new Set(ids.map((id) => parseEntryId(id)?.id ?? id))];
      if (keys.length === 0) return [];
      const { data, error } = await db()
        .from("character_entries")
        .select(COLUMNS)
        .eq("lang", lang)
        .in("character_id", keys);
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toCharacter);
    },
    async create(input) {
      if (input.id) return createOnce(input.id, input);
      const id = `u-${randomUUID()}`;
      const made = await db().from("characters").insert({
        id,
        custom_origin: input.origin,
        image_url: input.imageUrl,
        created_by: input.createdBy,
      });
      if (made.error) throw made.error;
      const named = await db()
        .from("character_names")
        .insert({
          character_id: id,
          lang: input.lang,
          name: input.name,
          norm: normalizeName(input.name),
          popularity: 0,
        });
      if (named.error) {
        await db().from("characters").delete().eq("id", id);
        throw named.error;
      }
      return {
        id,
        lang: input.lang,
        name: input.name,
        origin: input.origin,
        imageUrl: input.imageUrl,
        aliases: [],
      };
    },
    async extras(lang) {
      const created: Character[] = [];
      const images: Record<string, string> = {};
      const mine = await db()
        .from("character_entries")
        .select(COLUMNS)
        .eq("lang", lang)
        .like("character_id", "u-%")
        .order("created_at", { ascending: true })
        .limit(5000);
      if (mine.error) throw mine.error;
      for (const row of (mine.data ?? []) as Row[])
        created.push(toCharacter(row));
      // Covers that moved to a player's picture (picked enough): library pictures point elsewhere.
      const swapped = await db()
        .from("characters")
        .select("id, image_url")
        .not("id", "like", "u-%")
        .like("image_url", `${SUPABASE_URL}/storage/v1/object/public/%`)
        .limit(5000);
      if (swapped.error) throw swapped.error;
      for (const row of swapped.data ?? [])
        if (row.image_url) images[entryId(lang, row.id)] = row.image_url;
      return { created, images };
    },
    async randomPopular(lang, count) {
      const { data, error } = await db()
        .from("character_entries")
        .select(COLUMNS)
        .eq("lang", lang)
        .not("popularity", "is", null)
        .not("image_url", "is", null)
        .order("popularity", { ascending: false })
        .limit(300);
      if (error) throw error;
      const pool = ((data ?? []) as Row[]).map(toCharacter);
      const picked: Character[] = [];
      while (pool.length && picked.length < count) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
      return picked;
    },
    starters,
  };
}
