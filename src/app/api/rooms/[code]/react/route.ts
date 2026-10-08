import { GameError } from "@/game/types";
import { getBackend } from "@/server/backend";
import { failure, handle, noStore, readJson, sameOrigin } from "@/server/http";
import { reactOnStage } from "@/server/lineup";
import { allow } from "@/server/rate-limit";
import { normalizeCode } from "@/server/rooms";

/**
 * What for?: a small batch of reactions to a board on stage, `{ board,
 * counts }` (the board's owner, one count per emoji). Counted quietly and
 * floated on every screen over the room's channel. 204 when counted, or when
 * the stage closed before the batch got here.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/react">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const me = await getBackend().auth.identity("en");
    if (!allow(`react:${me.id}`, 60, 60_000)) return failure("rate_limited");
    const body = await readJson(request);
    const { board, counts } = (body ?? {}) as {
      board?: unknown;
      counts?: unknown;
    };
    if (typeof board !== "string" || !Array.isArray(counts))
      throw new GameError("invalid_input");
    await reactOnStage(code, me.id, board, counts as number[]);
    return new Response(null, { status: 204, headers: noStore });
  });
}
