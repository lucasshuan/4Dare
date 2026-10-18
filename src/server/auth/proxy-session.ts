import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { BACKEND, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/config";
import { cookieDomain } from "@/lib/hosts";
import {
  GUEST_COOKIE,
  guestCookieOptions,
  newGuest,
  openGuest,
  sealGuest,
} from "./guest";

/**
 * Called by src/proxy.ts on every page request. Gives a first-time visitor
 * their guest cookie here, before the page's first parallel requests (who am
 * I, join the room, ...) could each make a different guest. No database
 * involved. Supabase mode also refreshes an account's auth cookies before
 * they expire.
 */
export async function refreshSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  if (!openGuest(request.cookies.get(GUEST_COOKIE)?.value)) {
    const value = sealGuest(newGuest());
    request.cookies.set(GUEST_COOKIE, value);
    response.cookies.set(
      GUEST_COOKIE,
      value,
      guestCookieOptions(request.nextUrl.protocol === "https:"),
    );
  }
  if (BACKEND !== "supabase") return response;
  const domain = cookieDomain(request.headers.get("host"));
  // a guest (or a crawler) has no auth cookie: no session to refresh
  if (request.cookies.getAll().some((c) => c.name.startsWith("sb-")))
    await refreshAuth(request, response, domain);
  if (domain) shareSession(request, response, domain);
  return response;
}

/** Refreshes an account's auth cookies before they expire. */
async function refreshAuth(
  request: NextRequest,
  response: NextResponse,
  domain: string | undefined,
) {
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: domain ? { domain } : undefined,
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
}

/** Set once the auth cookies moved to the whole domain. */
const SHARED_COOKIE = "dare_shared";

/**
 * Auth cookies written before the panel had its own host belong to www only.
 * Once per browser, they move to the whole domain, so admin.4dare.com sees the
 * same session: each is written again for the domain and the host's own copy
 * expires. Raw headers, after every cookie the response sets through its API
 * (which rewrites the header), since both copies share a name.
 */
function shareSession(
  request: NextRequest,
  response: NextResponse,
  domain: string,
) {
  if (request.cookies.has(SHARED_COOKIE)) return;
  const secure = request.nextUrl.protocol === "https:" ? "; Secure" : "";
  const year = 60 * 60 * 24 * 365;
  for (const { name, value } of request.cookies.getAll()) {
    if (!name.startsWith("sb-")) continue;
    response.headers.append(
      "set-cookie",
      `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`,
    );
    // just refreshed: the response already writes it for the domain
    if (response.cookies.has(name)) continue;
    response.headers.append(
      "set-cookie",
      `${name}=${encodeURIComponent(value)}; Domain=${domain}; Path=/; Max-Age=${year}; SameSite=Lax${secure}`,
    );
  }
  response.headers.append(
    "set-cookie",
    `${SHARED_COOKIE}=1; Domain=${domain}; Path=/; Max-Age=${year}; SameSite=Lax${secure}`,
  );
}
