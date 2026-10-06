import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LANGS, type Lang } from "@/game/types";
import { GUEST_COOKIE, openGuest } from "@/server/auth/guest";
import { safeNext } from "@/server/auth/safe-next";
import { getBackend } from "@/server/backend";
import { syncProfile } from "@/server/backend/supabase/auth";
import { sessionClient } from "@/server/backend/supabase/clients";
import { handOverSeats } from "@/server/rooms";

/**
 * Discord/Google send people back here. The guest they were (a cookie, never
 * a database row) hands over to the account: its matches move to it, and the
 * account takes every seat the guest had, wherever they signed in from.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const back = (failed: boolean) => {
    const to = new URL(next, url.origin);
    if (failed) to.searchParams.set("auth_error", "1");
    return NextResponse.redirect(to, 303);
  };
  const code = url.searchParams.get("code");
  if (!code) return back(true);
  const client = await sessionClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back(true);

  const guest = openGuest((await cookies()).get(GUEST_COOKIE)?.value);
  let profile: Awaited<ReturnType<typeof syncProfile>> | null = null;
  try {
    profile = await syncProfile(data.user, guest);
  } catch (e) {
    // The next /api/me call syncs the profile again.
    console.error("auth callback: profile sync failed", e);
  }
  if (!guest || guest.id === data.user.id) return back(false);

  await getBackend()
    .matches.reassign(guest.id, data.user.id)
    .catch((e: unknown) =>
      console.error("auth callback: moving guest matches failed", e),
    );
  if (profile) {
    const prefix = /^\/(en|es|ja|pt)(?:\/|$)/.exec(next)?.[1];
    const lang: Lang = (LANGS as readonly string[]).includes(prefix ?? "")
      ? (prefix as Lang)
      : "en";
    const room = /^\/(?:(?:en|es|ja|pt)\/)?r\/([A-Z0-9]{5})\/?$/.exec(next);
    await handOverSeats(
      guest.id,
      {
        id: profile.id,
        isGuest: false,
        name: profile.name,
        guestNumber: profile.guest_number,
        avatar: profile.avatar,
        lang,
      },
      room?.[1] ?? null,
    ).catch((e: unknown) =>
      console.error("auth callback: moving guest seats failed", e),
    );
  }
  return back(false);
}
