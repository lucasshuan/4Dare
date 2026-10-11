import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import type { Lang } from "./game/types";
import { localizePath, routePath } from "./i18n/paths";
import { routing } from "./i18n/routing";
import { refreshSession } from "./server/auth/proxy-session";

const intl = createMiddleware(routing);

// Locale routing (/r/CODE → /pt/r/CODE), translated page addresses
// (/pt/quem-sou-eu is the who-am-i route) plus keeping the auth session fresh.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const m = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  const lang =
    m && (routing.locales as readonly string[]).includes(m[1])
      ? (m[1] as Lang)
      : null;
  let route: string | null = null;
  if (lang) {
    const path = m?.[2] ?? "/";
    route = routePath(path);
    const wanted = localizePath(lang, route);
    // the route's English address, or another language's word for it
    if (path !== wanted)
      return NextResponse.redirect(
        new URL(`/${lang}${wanted}${search}`, request.url),
        308,
      );
    if (route === path) route = null;
  }
  let response = intl(request);
  if (route && response.headers.has("x-middleware-next")) {
    const rewrite = NextResponse.rewrite(
      new URL(`/${lang}${route}${search}`, request.url),
    );
    // keep what next-intl set: cookies and the request headers it passes on
    response.headers.forEach((value, key) => {
      if (key !== "x-middleware-next" && key !== "set-cookie")
        rewrite.headers.set(key, value);
    });
    for (const cookie of response.cookies.getAll()) rewrite.cookies.set(cookie);
    response = rewrite;
  }
  return refreshSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
