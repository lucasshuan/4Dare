import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const env = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};

let service: SupabaseClient | null = null;

/** Full access, server only. The browser never talks to the tables. */
export function serviceClient(): SupabaseClient {
  service ??= createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return service;
}

/** The caller's session, read from (and written to) the auth cookies. One per request. */
export async function sessionClient(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
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
    },
  );
}
