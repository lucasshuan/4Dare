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
  await applyDueTimeouts(code);
  const { rooms, auth } = getBackend();
  const stored = await rooms.get(code);
  if (!stored || stored.state.phase === "closed") {
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: noStore },
    );
  }
  const me = await auth.me("en");
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
