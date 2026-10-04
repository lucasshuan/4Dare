import { NextResponse } from "next/server";
import { BACKEND } from "@/config";
import { safeNext } from "@/server/auth/safe-next";
import { sessionClient } from "@/server/backend/supabase/clients";

const PROVIDERS = ["discord", "google"] as const;

/**
 * /auth/sign-in?provider=discord&next=/pt/profile: starts the Discord/Google
 * sign-in here, so the browser never loads the Supabase client for it. The
 * PKCE verifier goes into the auth cookies; /auth/callback finishes the job.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const provider = PROVIDERS.find(
    (p) => p === url.searchParams.get("provider"),
  );
  const failed = () => {
    const to = new URL(next, url.origin);
    to.searchParams.set("auth_error", "1");
    return NextResponse.redirect(to, 303);
  };
  if (BACKEND !== "supabase" || !provider) return failed();
  const callback = new URL("/auth/callback", url.origin);
  callback.searchParams.set("next", next);
  const client = await sessionClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.href, skipBrowserRedirect: true },
  });
  if (error || !data.url) return failed();
  return NextResponse.redirect(data.url, 303);
}
