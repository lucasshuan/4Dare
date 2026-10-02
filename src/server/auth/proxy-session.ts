import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { BACKEND } from "@/config";

/**
 * Called by src/proxy.ts on every page request. Local mode: nothing to do.
 * Supabase mode: refresh the auth cookies on `response` before they expire.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (BACKEND !== "supabase") return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
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
    },
  );
  await supabase.auth.getClaims();
  return response;
}
