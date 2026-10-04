// Writes the database types (src/server/backend/supabase/database.types.ts) from the live
// Supabase schema, so the code knows every table, column and function. Run it after a
// migration:
//
//   pnpm db:types
//
// Reads from .env.local (or the environment):
//   NEXT_PUBLIC_SUPABASE_URL   https://<ref>.supabase.co (or SUPABASE_URL)
//   SUPABASE_ACCESS_TOKEN      supabase.com/dashboard/account/tokens
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const env = (name: string) => process.env[name]?.trim() || undefined;
const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SUPABASE_URL");
const token = env("SUPABASE_ACCESS_TOKEN");
const ref = supabaseUrl?.match(/^https:\/\/([a-z]{20})\.supabase\.co\/?$/)?.[1];
if (!ref || !token) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co) and SUPABASE_ACCESS_TOKEN in .env.local first.",
  );
  process.exit(1);
}

const file = join(
  process.cwd(),
  "src/server/backend/supabase/database.types.ts",
);

// CommonJS under tsx: no top-level await.
async function main() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/types/typescript?included_schemas=public`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok)
    throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const { types } = (await res.json()) as { types: string };
  writeFileSync(file, types);
  execFileSync("pnpm", ["exec", "biome", "format", "--write", file], {
    stdio: "inherit",
  });
  console.log(`Wrote ${file}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
