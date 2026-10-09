import { failure, handle, langParam, noStore } from "@/server/http";
import { workshopItem } from "@/server/workshop";

/** One Workshop card (a shared link to a suggestion): `WorkshopItem`. */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/workshop/[id]">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (id.length > 200) return failure("invalid_input");
    const item = await workshopItem(decodeURIComponent(id), langParam(request));
    if (!item) return failure("not_found");
    return Response.json(item, { headers: noStore });
  });
}
