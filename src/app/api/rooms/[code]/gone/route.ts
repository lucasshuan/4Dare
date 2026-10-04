import { GameError } from "@/game/types";
import { getBackend } from "@/server/backend";
import { dispatch, normalizeCode, seated } from "@/server/rooms";

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
  // The others' pages refetch when the grace ends (the view's `sweepAt`) and
  // that read settles it, so no function waits out the grace.
  return new Response(null, { status: 204 });
}
