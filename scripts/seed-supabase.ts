// Loads the starter character library (data/characters/*.json) into Supabase.
// Run: pnpm seed   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local; `vercel env pull .env.local` brings both)
// Safe to rerun after rebuilding the library: entries the new files dropped are
// deleted, and pictures players swapped in (stored in Supabase) are kept.
// Characters players created (ids "u-...") are never touched.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeName } from "../src/game/match";
import type { SeedCharacter } from "../src/server/backend/seed-format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY first.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
/** Pictures uploaded through the game live in Supabase Storage. */
const SWAPPED = `${url}/storage/v1/object/public/`;

/** Library rows already in the table for `lang`: id -> image_url. */
async function existingRows(lang: string): Promise<Map<string, string | null>> {
  const rows = new Map<string, string | null>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("characters")
      .select("id, image_url")
      .or(`id.like.${lang}-wd-*,id.like.${lang}-al-*`)
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) rows.set(row.id, row.image_url);
    if (data.length < 1000) return rows;
  }
}

for (const lang of ["en", "pt", "ja"] as const) {
  const file = join(process.cwd(), "data", "characters", `${lang}.json`);
  const list = JSON.parse(readFileSync(file, "utf8")) as SeedCharacter[];
  const existing = await existingRows(lang);
  const rows = list.map((c) => {
    const current = existing.get(c.id);
    return {
      id: c.id,
      lang,
      name: c.name,
      norm: normalizeName(c.name),
      origin: c.origin,
      image_url: current?.startsWith(SWAPPED) ? current : c.imageUrl,
      aliases: c.aliases,
      alias_norms: c.aliases.map(normalizeName).filter(Boolean),
      popularity: c.popularity,
    };
  });
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("characters")
      .upsert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  const keep = new Set(rows.map((row) => row.id));
  const stale = [...existing.keys()].filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await db
      .from("characters")
      .delete()
      .in("id", stale.slice(i, i + 200));
    if (error) throw error;
  }
  console.log(
    `${lang}: ${rows.length} characters, ${stale.length} old ones removed`,
  );
}
