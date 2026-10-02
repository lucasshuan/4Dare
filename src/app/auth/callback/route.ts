import { NextResponse } from "next/server";
import { syncProfile } from "@/server/backend/supabase/auth";
import { sessionClient } from "@/server/backend/supabase/clients";

/** Only same-site paths, so the callback can't be used to bounce people elsewhere. */
function safeNext(raw: string | null) {
  return raw?.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/";
}

/**
 * Discord/Google send people back here. A guest's anonymous user was linked to
 * the account (same id, so they keep their seat); if that Discord/Google
 * account already belonged to someone, sign in to it instead.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const back = (failed: boolean) => {
    const to = new URL(next, url.origin);
    if (failed) to.searchParams.set("auth_error", "1");
    return NextResponse.redirect(to, 303);
  };
  const client = await sessionClient();

  const provider = url.searchParams.get("provider");
  const alreadyLinked =
    url.searchParams.get("error_code") === "identity_already_exists" ||
    /already (linked|exists)/i.test(
      url.searchParams.get("error_description") ?? "",
    );
  if (alreadyLinked && (provider === "discord" || provider === "google")) {
    const redirectTo = new URL("/auth/callback", url.origin);
    redirectTo.searchParams.set("next", next);
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectTo.toString() },
    });
    return !error && data.url
      ? NextResponse.redirect(data.url, 303)
      : back(true);
  }

  const code = url.searchParams.get("code");
  if (!code) return back(true);
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back(true);
  try {
    await syncProfile(data.user);
  } catch (e) {
    // The next /api/me call syncs the profile again.
    console.error("auth callback: profile sync failed", e);
  }
  return back(false);
}
