import { toView } from "@/game/view";
import { getBackend } from "@/server/backend";
import { applyDueTimeouts, normalizeCode } from "@/server/rooms";

const noStore = { "Cache-Control": "no-store" };

/** The room as the caller may see it. Fires any clock timeouts that are due first. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/rooms/[code]">,
) {
  const code = normalizeCode((await ctx.params).code);
  if (!code)
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: noStore },
    );
  const { auth } = getBackend();
  // The room read and the identity check don't depend on each other.
  const [stored, me] = await Promise.all([
    applyDueTimeouts(code),
    auth.me("en"),
  ]);
  if (!stored || stored.state.phase === "closed") {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: noStore },
    );
  }
  if (!stored.state.players.some((p) => p.id === me.id)) {
    return Response.json(
      { error: "not_member" },
      { status: 403, headers: noStore },
    );
  }
  return Response.json(
    toView(stored.state, stored.version, me.id, Date.now()),
    { headers: noStore },
  );
}
