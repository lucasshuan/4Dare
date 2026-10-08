import { GameError } from "@/game/types";
import { getBackend } from "@/server/backend";
import { failure, handle, noStore, readJson, sameOrigin } from "@/server/http";
import { reactOnStage } from "@/server/lineup";
import { allow } from "@/server/rate-limit";
import { normalizeCode } from "@/server/rooms";

/**
 * What for?: a small batch of reactions to the board on stage, `{ counts }`
 * with one count per emoji. Counted quietly and floated on every screen over
 * the room's channel. 204 when counted.
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
    const counts = (body as { counts?: unknown } | null)?.counts;
    if (!Array.isArray(counts)) throw new GameError("invalid_input");
    await reactOnStage(code, me.id, counts as number[]);
    return new Response(null, { status: 204, headers: noStore });
  });
}
