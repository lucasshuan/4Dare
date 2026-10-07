import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { playerCard } from "@/server/profiles";
import { allow } from "@/server/rate-limit";

const ID = /^[A-Za-z0-9-]{1,64}$/;

/** The quick card of an account (`PlayerCard`), names in `?lang=`; 404 for a guest. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/players/[id]/card">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!ID.test(id)) return failure("invalid_input");
    const lang = langParam(request);
    const me = await getBackend().auth.identity(lang);
    if (!allow(`card:${me.id}`, 240, 60_000)) return failure("rate_limited");
    const card = await playerCard(id, me.id, lang);
    if (!card) return failure("not_found");
    return Response.json(card, { headers: noStore });
  });
}
