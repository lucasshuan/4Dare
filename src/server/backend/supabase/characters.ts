import "server-only";
import { randomUUID } from "node:crypto";
import { SUPABASE_URL } from "@/config";
import { normalizeName } from "@/game/match";
import type { Character, Lang } from "@/game/types";
import type { CharacterStore } from "../types";
import { serviceClient } from "./clients";

interface Row {
  id: string;
  lang: Lang;
  name: string;
  origin: string | null;
  image_url: string | null;
  aliases: string[] | null;
}

const COLUMNS = "id, lang, name, origin, image_url, aliases";

const toCharacter = (r: Row): Character => ({
  id: r.id,
  lang: r.lang,
  name: r.name,
  origin: r.origin,
  imageUrl: r.image_url,
  aliases: r.aliases ?? [],
});

export function supabaseCharacters(): CharacterStore {
  const db = () => serviceClient();
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
    async get(id) {
      const { data, error } = await db()
        .from("characters")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toCharacter(data as Row) : null;
    },
    async create(input) {
      const row = {
        id: `u-${randomUUID()}`,
        lang: input.lang,
        name: input.name,
        norm: normalizeName(input.name),
        alias_norms: [],
        origin: input.origin,
        image_url: input.imageUrl,
        aliases: [],
        popularity: 0,
        created_by: input.createdBy,
      };
      const { data, error } = await db()
        .from("characters")
        .insert(row)
        .select(COLUMNS)
        .single();
      if (error) throw error;
      return toCharacter(data as Row);
    },
    async setImage(id, imageUrl) {
      const { data, error } = await db()
        .from("characters")
        .update({ image_url: imageUrl })
        .eq("id", id)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw error;
      return data ? toCharacter(data as Row) : null;
    },
    async extras(lang) {
      // Player uploads live in Storage; library pictures point elsewhere.
      const uploaded = `${SUPABASE_URL}/storage/v1/object/public/*`;
      const { data, error } = await db()
        .from("characters")
        .select(COLUMNS)
        .eq("lang", lang)
        .or(`id.like.u-*,image_url.like.${uploaded}`)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      const created: Character[] = [];
      const images: Record<string, string> = {};
      for (const row of (data ?? []) as Row[]) {
        if (row.id.startsWith("u-")) created.push(toCharacter(row));
        else if (row.image_url) images[row.id] = row.image_url;
      }
      return { created, images };
    },
    async randomPopular(lang, count) {
      const { data, error } = await db()
        .from("characters")
        .select(COLUMNS)
        .eq("lang", lang)
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
  };
}
