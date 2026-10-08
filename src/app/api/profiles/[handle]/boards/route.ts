import { normalizeHandle } from "@/game/profile/handle";
import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { profileBoards } from "@/server/profiles";
import { allow } from "@/server/rate-limit";

const HANDLE = /^[a-z0-9_]{3,20}$/;

/**
 * An account's latest What for? boards, missions in `?lang=`:
 * `{ boards: ProfileBoard[] }`. 404 when the reader may not see its activity.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/profiles/[handle]/boards">,
) {
  return handle(async () => {
    const wanted = normalizeHandle(
      decodeURIComponent((await ctx.params).handle),
    );
    if (!HANDLE.test(wanted)) return failure("not_found");
    const lang = langParam(request);
    const me = await getBackend().auth.identity(lang);
    if (!allow(`boards:${me.id}`, 60, 60_000)) return failure("rate_limited");
    const boards = await profileBoards(wanted, me.id, lang);
    if (!boards) return failure("not_found");
    return Response.json({ boards }, { headers: noStore });
  });
}
