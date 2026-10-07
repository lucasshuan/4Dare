import { normalizeHandle } from "@/game/profile/handle";
import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { profileView } from "@/server/profiles";
import { allow } from "@/server/rate-limit";

const HANDLE = /^[a-z0-9_]{3,20}$/;

/**
 * An account's profile, names in `?lang=`: `ProfileView`. Per viewer (their
 * own pictures waiting on the detector are in it), so never cached.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/profiles/[handle]">,
) {
  return handle(async () => {
    const wanted = normalizeHandle(
      decodeURIComponent((await ctx.params).handle),
    );
    if (!HANDLE.test(wanted)) return failure("not_found");
    const lang = langParam(request);
    const me = await getBackend().auth.identity(lang);
    if (!allow(`profile:${me.id}`, 120, 60_000)) return failure("rate_limited");
    const view = await profileView(wanted, me.id, lang);
    if (!view) return failure("not_found");
    return Response.json(view, { headers: noStore });
  });
}
