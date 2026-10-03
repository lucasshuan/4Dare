import { GameError, GONE_GRACE_MS } from "@/game/types";
import { getBackend } from "@/server/backend";
import { background } from "@/server/background";
import {
  applyDueTimeouts,
  dispatch,
  normalizeCode,
  seated,
} from "@/server/rooms";

/**
 * The player's page closed (sent as a beacon). If they don't show up again
 * within the grace, a lobby frees their seat and a match nobody is left in
 * closes; a page that just reloads comes back in time.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]/gone">,
) {
  const code = normalizeCode((await ctx.params).code);
  if (!code) return new Response(null, { status: 204 });
  const me = await getBackend().auth.identity("en");
  try {
    await dispatch(code, (state) => {
      if (!seated(state, me.id)) throw new GameError("not_member");
      return { type: "GONE", playerId: me.id };
    });
  } catch (e) {
    if (e instanceof GameError) return new Response(null, { status: 204 });
    throw e;
  }
  // Settle it right after the grace, so the others see it without waiting for a poll.
  background(async () => {
    await new Promise((r) => setTimeout(r, GONE_GRACE_MS + 250));
    await applyDueTimeouts(code);
  });
  return new Response(null, { status: 204 });
}
