import { getBackend } from "@/server/backend";
import { failure, handle, noStore, sameOrigin } from "@/server/http";
import { reportPicture } from "@/server/pictures";
import { allow } from "@/server/rate-limit";

/**
 * Reports a player's picture of a character: `{ hidden }`, true once enough
 * people reported it (it leaves every tray, and the cover moves on).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/pictures/[id]/report">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const { id } = await ctx.params;
    const me = await getBackend().auth.identity("en");
    if (!allow(`report:${me.id}`, 20, 60_000)) return failure("rate_limited");
    return Response.json(await reportPicture(id, me.id), { headers: noStore });
  });
}
