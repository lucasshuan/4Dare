import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import type { Lang } from "./game/types";
import { localePath, routePath, wordLanguage } from "./i18n/paths";
import { LOCALE_COOKIE, routing } from "./i18n/routing";
import { refreshSession } from "./server/auth/proxy-session";

const intl = createMiddleware(routing);

const isLang = (segment: string | undefined): segment is Lang =>
  (routing.locales as readonly string[]).includes(segment ?? "");

/** "/pt/quem-sou-eu" → ["pt", "/quem-sou-eu"]; null without a language prefix. */
function splitLang(pathname: string): [Lang, string] | null {
  const m = /^\/([^/]+)(\/.*)?$/.exec(pathname);
  return m && isLang(m[1]) ? [m[1], m[2] ?? "/"] : null;
}

/** Share images keep the address Next writes for them (/en/opengraph-image/card), with no hop. */
const SHARE_IMAGE = /\/(?:opengraph|twitter)-image(?:\/|$)/;

const moved = (to: string, request: NextRequest) =>
  NextResponse.redirect(new URL(to, request.url), 308);

// Locale routing (/r/CODE → /pt/r/CODE for a Portuguese browser), translated
// page addresses (/pt/quem-sou-eu is the who-am-i route) plus keeping the auth
// session fresh. English has no prefix: /en/... moves to the bare address.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const prefixed = splitLang(pathname);
  if (prefixed && SHARE_IMAGE.test(prefixed[1])) return NextResponse.next();

  let route: string | null = null;
  if (prefixed) {
    const [lang, path] = prefixed;
    route = routePath(path);
    const wanted = localePath(lang, route);
    // /en/..., the route's English address, or another language's word for it
    if (pathname !== wanted) {
      const res = moved(`${wanted}${search}`, request);
      // an /en address (an old link) asked for English: keep it on the bare one
      if (lang === routing.defaultLocale)
        res.cookies.set(LOCALE_COOKIE, lang, { path: "/", sameSite: "lax" });
      return res;
    }
    if (route === path) route = null;
  } else {
    // an unprefixed translated word (/quem-sou-eu) is that language's page
    const lang = wordLanguage(pathname);
    if (lang)
      return moved(
        `${localePath(lang, routePath(pathname))}${search}`,
        request,
      );
  }

  let response = intl(request);
  const location = response.headers.get("location");
  if (location) {
    // next-intl sends a browser that wants another language to /pt/who-am-i:
    // send it to the translated address in one hop
    const to = new URL(location, request.url);
    const target = splitLang(to.pathname);
    const wanted = target && localePath(target[0], routePath(target[1]));
    if (wanted && wanted !== to.pathname) {
      to.pathname = wanted;
      response.headers.set("location", to.toString());
    }
  }
  if (prefixed && route && response.headers.has("x-middleware-next")) {
    const rewrite = NextResponse.rewrite(
      new URL(`/${prefixed[0]}${route}${search}`, request.url),
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
