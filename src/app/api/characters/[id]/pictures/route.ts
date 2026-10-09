import { getBackend } from "@/server/backend";
import { invalidateCatalog } from "@/server/catalog";
import { failure, handle, langParam, noStore, sameOrigin } from "@/server/http";
import { readImage } from "@/server/images";
import { characterIdOf } from "@/server/library-sheet";
import {
  sendPicture,
  showAuthor,
  type TrayPicture,
  trayOf,
} from "@/server/pictures";
import { allow } from "@/server/rate-limit";

const ID = /^[A-Za-z0-9-]{1,200}$/;

/**
 * The pictures of a character the caller may put on their card, best first
 * (the cover leads), senders named in `?lang=`: `{ pictures: TrayPicture[] }`. Per viewer, since their
 * own pictures still waiting on the detector are in it, so never cached.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/characters/[id]/pictures">,
) {
  return handle(async () => {
    const { id } = await ctx.params;
    if (!ID.test(id)) return failure("invalid_input");
    const me = await getBackend().auth.identity("en");
    if (!allow(`pictures:${me.id}`, 120, 60_000))
      return failure("rate_limited");
    const body: { pictures: TrayPicture[] } = {
      pictures: await trayOf(id, me.id, langParam(request)),
    };
    return Response.json(body, { headers: noStore });
  });
}

/**
 * One more picture of a character, sent from its sheet (multipart field
 * `image`, cropped 4:5 by the browser). The detector checks it first
 * (image_rejected when it refuses); when it can't tell, only its sender sees
 * it until the next check. Comes back as the tray shows it: `{ picture }`.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/characters/[id]/pictures">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const id = characterIdOf((await ctx.params).id);
    if (!id) return failure("invalid_input");
    const { auth, library } = getBackend();
    const me = await auth.identity("en");
    // the same budget as every other picture a player sends
    if (!allow(`upload:${me.id}`, 30, 60_000)) return failure("rate_limited");
    if (!(await library.exists(id))) return failure("not_found");
    const form = await request.formData().catch(() => null);
    const image = form ? await readImage(form.get("image")) : null;
    if (!image) return failure("invalid_input");
    const picture = await sendPicture(me, id, image);
    invalidateCatalog();
    const body: { picture: TrayPicture } = {
      picture: {
        id: picture.id,
        url: picture.url,
        author: showAuthor(picture.author, langParam(request)),
        mine: true,
        pending: picture.status === "pending",
      },
    };
    return Response.json(body, { headers: noStore });
  });
}
