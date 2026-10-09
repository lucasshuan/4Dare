import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { aliasHistory } from "@/server/library-sheet";
import { allow } from "@/server/rate-limit";

/** Who put, changed, took out or brought back each nickname of a character, newest first. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/characters/[id]/history">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    const me = await getBackend().auth.identity("en");
    if (!allow(`sheet:${me.id}`, 120, 60_000)) return failure("rate_limited");
    const history = await aliasHistory(id, langParam(request));
    return Response.json({ history }, { headers: noStore });
  });
}
