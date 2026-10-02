// Supabase settings, with the names the Supabase integration on Vercel sets.
// The older "anon" / "service role" names still work as a fallback.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

// Which backend is in use. With no Supabase env vars the app runs in local mode:
// everything in memory, guests identified by a cookie. Good for dev and tests.
export const BACKEND: "supabase" | "local" =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY ? "supabase" : "local";

export const APP_NAME = "Dare";
