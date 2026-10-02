import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBackend } from "@/server/backend";
import { syncProfile } from "@/server/backend/supabase/auth";
import { sessionClient } from "@/server/backend/supabase/clients";
import {
  MERGE_COOKIE,
  openGuest,
  sealGuest,
} from "@/server/backend/supabase/guest-merge";

/** Only same-site paths, so the callback can't be used to bounce people elsewhere. */
function safeNext(raw: string | null) {
  return raw?.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/";
}

/**
 * Discord/Google send people back here. A guest's anonymous user was linked to
 * the account (same id, so they keep their seat and their matches); if that
 * Discord/Google account already belonged to someone, sign in to it instead
 * and move the guest's matches over.
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
  const jar = await cookies();

  const provider = url.searchParams.get("provider");
  const alreadyLinked =
    url.searchParams.get("error_code") === "identity_already_exists" ||
    /already (linked|exists)/i.test(
      url.searchParams.get("error_description") ?? "",
    );
  if (alreadyLinked && (provider === "discord" || provider === "google")) {
    const { data: current } = await client.auth.getUser();
    if (current.user?.is_anonymous) {
      jar.set(MERGE_COOKIE, sealGuest(current.user.id), {
        httpOnly: true,
        sameSite: "lax",
        secure: url.protocol === "https:",
        path: "/auth",
        maxAge: 600,
      });
    }
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
  const guestId = openGuest(jar.get(MERGE_COOKIE)?.value);
  if (guestId) {
    jar.delete({ name: MERGE_COOKIE, path: "/auth" });
    if (guestId !== data.user.id) {
      await getBackend()
        .matches.reassign(guestId, data.user.id)
        .catch((e: unknown) =>
          console.error("auth callback: moving guest matches failed", e),
        );
    }
  }
  return back(false);
}
