import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { characterSheet } from "@/server/library-sheet";
import { allow } from "@/server/rate-limit";

/** A character's sheet in `?lang=`: its card, numbers, names, nicknames and themes (`CharacterSheet`). */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/characters/[id]/sheet">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    const me = await getBackend().auth.identity("en");
    if (!allow(`sheet:${me.id}`, 120, 60_000)) return failure("rate_limited");
    const sheet = await characterSheet(id, langParam(request), me.id);
    if (!sheet) return failure("not_found");
    return Response.json(sheet, { headers: noStore });
  });
}
