import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LANGS, type Lang } from "@/game/types";
import { GUEST_COOKIE, openGuest } from "@/server/auth/guest";
import { getBackend } from "@/server/backend";
import { syncProfile } from "@/server/backend/supabase/auth";
import { sessionClient } from "@/server/backend/supabase/clients";
import { dispatch } from "@/server/rooms";

/** Only same-site paths, so the callback can't be used to bounce people elsewhere. */
function safeNext(raw: string | null) {
  return raw?.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/";
}

/**
 * Discord/Google send people back here. The guest they were (a cookie, never
 * a database row) hands over to the account: its matches move to it, and if
 * they signed in from a room, the account takes the guest's seat.
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
  const room = /^\/(?:(en|pt|ja)\/)?r\/([A-Z0-9]{5})\/?$/.exec(next);
  if (room && profile) {
    const lang = (LANGS as readonly string[]).includes(room[1] ?? "")
      ? (room[1] as Lang)
      : "en";
    const account = profile;
    await dispatch(room[2], () => ({
      type: "SWAP_PLAYER",
      from: guest.id,
      player: {
        id: account.id,
        isGuest: false,
        name: account.name,
        guestNumber: account.guest_number,
        avatar: account.avatar,
        lang,
      },
    })).catch(() => {
      // Not seated there (or the room is gone): nothing to hand over.
    });
  }
  return back(false);
}
