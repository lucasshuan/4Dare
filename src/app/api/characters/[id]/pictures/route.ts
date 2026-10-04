import { getBackend } from "@/server/backend";
import { failure, handle, noStore } from "@/server/http";
import { type TrayPicture, trayOf } from "@/server/pictures";
import { allow } from "@/server/rate-limit";

const ID = /^[A-Za-z0-9-]{1,200}$/;

/**
 * The pictures of a character the caller may put on their card, best first
 * (the cover leads): `{ pictures: TrayPicture[] }`. Per viewer, since their
 * own pictures still waiting on the detector are in it, so never cached.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/characters/[id]/pictures">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!ID.test(id)) return failure("invalid_input");
    const me = await getBackend().auth.identity("en");
    if (!allow(`pictures:${me.id}`, 120, 60_000))
      return failure("rate_limited");
    const body: { pictures: TrayPicture[] } = {
      pictures: await trayOf(id, me.id),
    };
    return Response.json(body, { headers: noStore });
  });
}
