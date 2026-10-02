import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { BACKEND, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";

/**
 * Called by src/proxy.ts on every page request. Local mode: nothing to do.
 * Supabase mode: refresh the auth cookies on `response` before they expire.
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
  await supabase.auth.getClaims();
  return response;
}
