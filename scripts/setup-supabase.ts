// One command to get the Supabase project ready, instead of clicking through the dashboard:
// tables (supabase/migrations), anonymous users off (guests are a cookie), Discord and Google,
// redirect URLs, and the keys the app needs written to .env.local.
//
//   pnpm setup:supabase
//
// Reads from .env.local (or the environment):
//   NEXT_PUBLIC_SUPABASE_URL   https://<ref>.supabase.co (or SUPABASE_URL)
//   POSTGRES_URL_NON_POOLING   set by the Vercel integration: runs the migrations
//   SUPABASE_ACCESS_TOKEN      supabase.com/dashboard/account/tokens: auth settings and
//                              keys (also runs the migrations when there is no database URL)
//   DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET   optional
//   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET     optional
//   SITE_URL                   optional, the deployed site (default http://localhost:3000)
// Safe to run again: every step only sets what is missing or changed.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const env = (name: string) => process.env[name]?.trim() || undefined;
const supabaseUrl = env("NEXT_PUBLIC_SUPABASE_URL") ?? env("SUPABASE_URL");
const token = env("SUPABASE_ACCESS_TOKEN");
const databaseUrl = env("POSTGRES_URL_NON_POOLING");
const ref = supabaseUrl?.match(/^https:\/\/([a-z]{20})\.supabase\.co\/?$/)?.[1];
if (!ref || (!token && !databaseUrl)) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL (https://<ref>.supabase.co) and SUPABASE_ACCESS_TOKEN (or POSTGRES_URL_NON_POOLING) in .env.local first.",
  );
  process.exit(1);
}
const siteUrl = (env("SITE_URL") ?? "http://localhost:3000").replace(/\/$/, "");

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );
  const text = await res.text();
  if (!res.ok)
    throw new Error(
      `${init.method ?? "GET"} ${path}: ${res.status} ${text.slice(0, 300)}`,
    );
  return (text ? JSON.parse(text) : null) as T;
}

// CommonJS under tsx: no top-level await.
async function setup() {
  // 1. Tables, search function and storage buckets (the migrations are idempotent).
  const dir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const db = databaseUrl
    ? postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} })
    : null;
  try {
    for (const file of files) {
      const query = readFileSync(join(dir, file), "utf8");
      if (db) await db.unsafe(query);
      else
        await api("/database/query", {
          method: "POST",
          body: JSON.stringify({ query }),
        });
      console.log(`migration ${file}: ok`);
    }
  } finally {
    await db?.end();
  }

  if (!token) {
    console.log(`
No SUPABASE_ACCESS_TOKEN, so the auth settings were left as they are. Add one
(supabase.com/dashboard/account/tokens) and run this again, or in the dashboard:
  Authentication > Sign In / Providers: turn off anonymous sign-ins and manual
    linking, turn on Discord and Google with their client id and secret
  Authentication > URL Configuration: site URL ${siteUrl}; redirect URLs
    ${siteUrl}/** and http://localhost:3000/**
Discord and Google redirect URL: https://${ref}.supabase.co/auth/v1/callback`);
    return;
  }

  // 2. Auth: accounts only (Discord, Google). Guests are a signed cookie, never a Supabase user.
  const current = await api<{ uri_allow_list?: string | null }>("/config/auth");
  const allow = new Set(
    (current.uri_allow_list ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean),
  );
  allow.add(`${siteUrl}/**`);
  allow.add("http://localhost:3000/**");
  const providers: Record<string, unknown> = {};
  for (const name of ["discord", "google"] as const) {
    const id = env(`${name.toUpperCase()}_CLIENT_ID`);
    const secret = env(`${name.toUpperCase()}_CLIENT_SECRET`);
    if (!id || !secret) continue;
    providers[`external_${name}_enabled`] = true;
    providers[`external_${name}_client_id`] = id;
    providers[`external_${name}_secret`] = secret;
  }
  await api("/config/auth", {
    method: "PATCH",
    body: JSON.stringify({
      site_url: siteUrl,
      uri_allow_list: [...allow].join(","),
      external_anonymous_users_enabled: false,
      security_manual_linking_enabled: false,
      ...providers,
    }),
  });
  const enabled = ["discord", "google"].filter(
    (p) => providers[`external_${p}_enabled`],
  );
  console.log(
    `auth: anonymous users off (guests live in a cookie); site ${siteUrl}; providers: ${enabled.join(", ") || "none yet (set the client ids)"}`,
  );

  // 3. Keys the app reads, written to .env.local when missing.
  const keys = await api<{ type: string | null; api_key: string | null }[]>(
    "/api-keys?reveal=true",
  );
  const wanted: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      keys.find((k) => k.type === "publishable")?.api_key ?? undefined,
    SUPABASE_SECRET_KEY:
      keys.find((k) => k.type === "secret")?.api_key ?? undefined,
  };
  const envFile = join(process.cwd(), ".env.local");
  let text = existsSync(envFile) ? readFileSync(envFile, "utf8") : "";
  const added: string[] = [];
  for (const [name, value] of Object.entries(wanted)) {
    if (!value || new RegExp(`^${name}=.+`, "m").test(text)) continue;
    text = `${text.replace(/\n?$/, "\n")}${name}=${value}\n`;
    added.push(name);
  }
  if (added.length) writeFileSync(envFile, text.replace(/^\n/, ""));
  console.log(
    `.env.local: ${added.length ? `added ${added.join(", ")}` : "already complete"}`,
  );
  if (!wanted.SUPABASE_SECRET_KEY)
    console.log(
      "  no secret key yet: create one in Project Settings > API Keys and rerun",
    );

  console.log(
    `\nDiscord and Google redirect URL: https://${ref}.supabase.co/auth/v1/callback`,
  );
}

setup().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
