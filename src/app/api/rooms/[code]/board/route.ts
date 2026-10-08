import { getBackend } from "@/server/backend";
import { failure, handle, noStore, readJson, sameOrigin } from "@/server/http";
import { saveLineupBoard } from "@/server/lineup";
import { allow } from "@/server/rate-limit";
import { normalizeCode } from "@/server/rooms";

/**
 * What for?: saves the caller's board while they lay it out (the engine
 * trims it to the slate's limits). A route rather than a Server Action, like
 * the pick draft: autosaves must not queue in front of "Done". Quiet: nobody
 * else sees a board before the stage. 204 when saved.
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/board">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const me = await getBackend().auth.identity("en");
    if (!allow(`board:${me.id}`, 120, 60_000)) return failure("rate_limited");
    await saveLineupBoard(code, me.id, await readJson(request));
    return new Response(null, { status: 204, headers: noStore });
  });
}
