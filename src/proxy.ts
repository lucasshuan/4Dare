import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { refreshSession } from "./server/auth/proxy-session";

const intl = createMiddleware(routing);

// Locale routing (/r/CODE → /pt/r/CODE) plus keeping the auth session fresh.
export async function proxy(request: NextRequest) {
  const response = intl(request);
  return refreshSession(request, response);
}

export const config = {
  matcher: ["/((?!api|auth|_next|_vercel|.*\\..*).*)"],
};
