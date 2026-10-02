import { accountDefaults } from "@/server/backend/supabase/auth";
import {
  serviceClient,
  sessionClient,
} from "@/server/backend/supabase/clients";

/** Only same-site paths, so the callback can't be used to bounce people elsewhere. */
function safeNext(raw: string | null) {
  return raw?.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
    ? raw
    : "/";
}

/** Discord/Google send people back here: finish the sign-in and turn the profile into an account. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (code) {
    const client = await sessionClient();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const d = accountDefaults(data.user);
      const profiles = serviceClient().from("profiles");
      const { data: existing } = await profiles
        .select("id, is_guest, name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!existing) {
        await profiles.insert({
          id: data.user.id,
          is_guest: false,
          guest_number: 10 + Math.floor(Math.random() * 90),
          avatar: { kind: "color", color: "#DCE8FA" },
          ...d,
        });
      } else if (existing.is_guest) {
        await profiles
          .update({
            is_guest: false,
            name: existing.name ?? d.name,
            provider: d.provider,
            provider_avatar_url: d.provider_avatar_url,
          })
          .eq("id", data.user.id);
      }
    }
  }
  return Response.redirect(new URL(next, url.origin), 303);
}
