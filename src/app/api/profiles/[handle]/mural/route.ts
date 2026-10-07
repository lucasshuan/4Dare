import { normalizeHandle } from "@/game/profile/handle";
import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { muralView } from "@/server/mural";
import { allow } from "@/server/rate-limit";

const HANDLE = /^[a-z0-9_]{3,20}$/;

/**
 * A page of an account's mural, names in `?lang=`, older than `?before=`
 * (ms) when given: `MuralView`. 404 when the reader may not see it.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/profiles/[handle]/mural">,
) {
  return handle(async () => {
    const wanted = normalizeHandle(
      decodeURIComponent((await ctx.params).handle),
    );
    if (!HANDLE.test(wanted)) return failure("not_found");
    const raw = new URL(request.url).searchParams.get("before");
    const before = raw && /^\d{1,15}$/.test(raw) ? Number(raw) : null;
    const lang = langParam(request);
    const me = await getBackend().auth.identity(lang);
    if (!allow(`mural:${me.id}`, 120, 60_000)) return failure("rate_limited");
    const view = await muralView(wanted, me, lang, before);
    if (!view) return failure("not_found");
    return Response.json(view, { headers: noStore });
  });
}
