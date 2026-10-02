import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

/** Secret key (Vercel integration: SUPABASE_SECRET_KEY; older projects: SUPABASE_SERVICE_ROLE_KEY). */
function secretKey() {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return key;
}

let service: SupabaseClient | null = null;

/** Full access, server only. The browser never talks to the tables. */
export function serviceClient(): SupabaseClient {
  service ??= createClient(SUPABASE_URL, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return service;
}

/** The caller's session, read from (and written to) the auth cookies. One per request. */
export async function sessionClient(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list)
            jar.set(name, value, options);
        } catch {
          // Server components cannot write cookies; route handlers and actions can.
        }
      },
    },
  });
}
