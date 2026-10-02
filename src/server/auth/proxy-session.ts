import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { BACKEND, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

/**
 * Called by src/proxy.ts on every page request. Local mode: nothing to do.
 * Supabase mode: refresh the auth cookies on `response` before they expire,
 * and make a first-time visitor a guest right here. Otherwise the page's
 * first parallel requests (who am I, join the room, ...) would each sign in
 * anonymously, and one browser would sit in a room as two players.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (BACKEND !== "supabase") return response;
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list, headers) => {
        for (const { name, value, options } of list) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers ?? {}))
          response.headers.set(key, value);
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) await supabase.auth.signInAnonymously();
  return response;
}
