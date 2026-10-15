import { NextResponse } from "next/server";
import { BACKEND } from "@/config";
import { authOrigin, isAdminHost } from "@/lib/hosts";
import { safeNext } from "@/server/auth/safe-next";
import { sessionClient } from "@/server/backend/supabase/clients";

const PROVIDERS = ["discord", "google"] as const;

/**
 * /auth/link?provider=google&next=/pt: links another provider to the signed-in
 * account (Supabase's manual linking must be on). It comes back through
 * /auth/callback, like a sign-in; a refusal comes back with ?link_error=1.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const provider = PROVIDERS.find(
    (p) => p === url.searchParams.get("provider"),
  );
  const failed = () => {
    const to = new URL(next, url.origin);
    to.searchParams.set("link_error", "1");
    return NextResponse.redirect(to, 303);
  };
  if (BACKEND !== "supabase" || !provider) return failed();
  const client = await sessionClient();
  const host = request.headers.get("host");
  const callback = new URL("/auth/callback", authOrigin(host, url.origin));
  callback.searchParams.set("next", next);
  // started on the panel: the way back ends there
  if (isAdminHost(host)) callback.searchParams.set("panel", "1");
  const { data, error } = await client.auth.linkIdentity({
    provider,
    options: { redirectTo: callback.href, skipBrowserRedirect: true },
  });
  if (error || !data.url) return failed();
  return NextResponse.redirect(data.url, 303);
}
