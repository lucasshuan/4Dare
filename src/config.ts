// Which backend is in use. With no Supabase env vars the app runs in local mode:
// everything in memory, guests identified by a cookie. Good for dev and tests.
export const BACKEND: "supabase" | "local" =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? "supabase"
    : "local";

export const APP_NAME = "Dare";
