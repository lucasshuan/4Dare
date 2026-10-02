// Loads the starter character library (data/characters.json, data/origins.json)
// and the theme list (data/themes.json) into Supabase.
// Run: pnpm seed   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local; `vercel env pull .env.local` brings both)
// Safe to rerun after rebuilding the library: characters, names and origins the
// new files dropped are deleted, and pictures players swapped in (stored in
// Supabase) are kept. Characters players created (ids "u-...") are never
// touched. Themes removed from the file are turned off (active = false); the
// AI's themes are left alone.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeName } from "../src/game/match";
import { themeId } from "../src/game/theme-id";
import { LANGS, type Theme } from "../src/game/types";
import {
  entryAliases,
  type SeedCharacter,
  type SeedOrigin,
} from "../src/server/backend/seed-format";

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

const readData = <T>(name: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "data", name), "utf8")) as T;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
}

async function upsert(table: string, rows: object[]) {
  for (const chunk of chunks(rows, 500)) {
    const { error } = await db.from(table).upsert(chunk);
    if (error) throw error;
  }
}

/** Library characters already in the table: id -> image_url. */
async function existingCharacters(): Promise<Map<string, string | null>> {
  const rows = new Map<string, string | null>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("characters")
      .select("id, image_url")
      .not("id", "like", "u-%")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) rows.set(row.id, row.image_url);
    if (data.length < 1000) return rows;
  }
}

async function seedThemes() {
  const list = readData<Theme[]>("themes.json");
  const rows = list.map((t) => ({
    id: themeId(t),
    en: t.en,
    pt: t.pt,
    ja: t.ja,
    theme_set: t.set,
    source: "bank",
    active: true,
  }));
  const { error } = await db.from("themes").upsert(rows);
  if (error) throw error;
  const ids = rows.map((row) => `"${row.id}"`).join(",");
  const off = await db
    .from("themes")
    .update({ active: false })
    .eq("source", "bank")
    .eq("active", true)
    .not("id", "in", `(${ids})`)
    .select("id");
  if (off.error) throw off.error;
  console.log(
    `themes: ${rows.length} from the file, ${off.data.length} turned off`,
  );
}

async function seedOrigins(origins: SeedOrigin[]) {
  await upsert(
    "origins",
    origins.map((origin) => ({ id: origin.id })),
  );
  await upsert(
    "origin_labels",
    origins.flatMap((origin) =>
      LANGS.flatMap((lang) => {
        const label = origin.labels[lang];
        return label ? [{ origin_id: origin.id, lang, label }] : [];
      }),
    ),
  );
  // Labels the file no longer has.
  for (const lang of LANGS) {
    const without = origins
      .filter((origin) => !origin.labels[lang])
      .map((origin) => origin.id);
    for (const chunk of chunks(without, 200)) {
      const { error } = await db
        .from("origin_labels")
        .delete()
        .eq("lang", lang)
        .in("origin_id", chunk);
      if (error) throw error;
    }
  }
  console.log(`origins: ${origins.length}`);
}

async function seedCharacters(characters: SeedCharacter[]) {
  const existing = await existingCharacters();
  await upsert(
    "characters",
    characters.map((c) => {
      const current = existing.get(c.id);
      return {
        id: c.id,
        kind: c.kind,
        category: c.category,
        origin_id: c.origin,
        image_url: current?.startsWith(SWAPPED) ? current : c.imageUrl,
      };
    }),
  );
  // Aliases are the language's own; the search keys also hold the names in
  // the other languages, the way the app searches.
  await upsert(
    "character_names",
    characters.flatMap((c) =>
      LANGS.flatMap((lang) => {
        const name = c.names[lang];
        if (!name) return [];
        return [
          {
            character_id: c.id,
            lang,
            name,
            norm: normalizeName(name),
            aliases: c.aliases[lang] ?? [],
            alias_norms: entryAliases(c, lang)
              .map(normalizeName)
              .filter(Boolean),
            popularity: c.popularity[lang] ?? null,
          },
        ];
      }),
    ),
  );
  // Names the file no longer has, then characters it dropped.
  for (const lang of LANGS) {
    const without = characters.filter((c) => !c.names[lang]).map((c) => c.id);
    for (const chunk of chunks(without, 200)) {
      const { error } = await db
        .from("character_names")
        .delete()
        .eq("lang", lang)
        .in("character_id", chunk);
      if (error) throw error;
    }
  }
  const keep = new Set(characters.map((c) => c.id));
  const stale = [...existing.keys()].filter((id) => !keep.has(id));
  for (const chunk of chunks(stale, 200)) {
    const { error } = await db.from("characters").delete().in("id", chunk);
    if (error) throw error;
  }
  const counts = LANGS.map(
    (lang) =>
      `${characters.filter((c) => c.popularity[lang] !== undefined).length} ${lang}`,
  ).join(", ");
  console.log(
    `characters: ${characters.length} (${counts}), ${stale.length} old ones removed`,
  );
}

async function dropUnusedOrigins(origins: SeedOrigin[]) {
  const keep = new Set(origins.map((origin) => origin.id));
  const stale: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("origins")
      .select("id")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    for (const row of data) if (!keep.has(row.id)) stale.push(row.id);
    if (data.length < 1000) break;
  }
  for (const chunk of chunks(stale, 200)) {
    const { error } = await db.from("origins").delete().in("id", chunk);
    if (error) throw error;
  }
  if (stale.length > 0)
    console.log(`origins: ${stale.length} old ones removed`);
}

// CommonJS under tsx: no top-level await.
async function seed() {
  await seedThemes();
  const origins = readData<SeedOrigin[]>("origins.json");
  await seedOrigins(origins);
  await seedCharacters(readData<SeedCharacter[]>("characters.json"));
  await dropUnusedOrigins(origins);
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
