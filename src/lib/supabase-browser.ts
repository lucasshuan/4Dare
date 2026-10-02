"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

let client: SupabaseClient | null = null;

/** The browser's client: only for realtime pings and the OAuth redirect. Never for reading tables. */
export function browserClient(): SupabaseClient {
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
