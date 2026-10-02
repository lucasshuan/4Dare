// Loads the starter character library (data/characters/*.json) into Supabase.
// Run: pnpm seed   (needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { normalizeName } from "../src/game/match";
import type { SeedCharacter } from "../src/server/backend/seed-format";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

for (const lang of ["en", "pt", "ja"] as const) {
  const file = join(process.cwd(), "data", "characters", `${lang}.json`);
  const list = JSON.parse(readFileSync(file, "utf8")) as SeedCharacter[];
  const rows = list.map((c) => ({
    id: c.id,
    lang,
    name: c.name,
    norm: normalizeName(c.name),
    origin: c.origin,
    image_url: c.imageUrl,
    aliases: c.aliases,
    alias_norms: c.aliases.map(normalizeName).filter(Boolean),
    popularity: c.popularity,
  }));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db
      .from("characters")
      .upsert(rows.slice(i, i + 500));
    if (error) throw error;
  }
  console.log(`${lang}: ${rows.length} characters`);
}
