import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore, sameOrigin } from "@/server/http";
import { readImage } from "@/server/images";
import {
  sendPicture,
  showAuthor,
  type TrayPicture,
  withdrawPicture,
} from "@/server/pictures";
import { allow } from "@/server/rate-limit";
import { normalizeCode, saveDraft, seated } from "@/server/rooms";

/**
 * A picture for the caller's pick card (multipart field `image`, cropped 4:5
 * by the browser). With `characterId` (a library character on the card) it
 * becomes one more picture of that character; without, it is the new name's.
 * The detector checks it first (image_rejected when it refuses), then it is
 * stored and put on the card's draft, and comes back:
 * `{ imageUrl, picture: TrayPicture }`. `replaces`: the id of the picture
 * this one adjusts (a crop moved on the card), which goes if nobody picked it.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/draft/image">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const { auth, rooms, characters } = getBackend();
    const me = await auth.identity("en");
    // the same budget as every other picture a player sends
    if (!allow(`upload:${me.id}`, 30, 60_000)) return failure("rate_limited");
    const form = await request.formData().catch(() => null);
    const image = form ? await readImage(form.get("image")) : null;
    if (!image) return failure("invalid_input");
    const rawId = form?.get("characterId");
    const characterId =
      typeof rawId === "string" && rawId.length > 0 && rawId.length <= 200
        ? rawId
        : null;
    // Only a picker with a card still open stores anything.
    const state = (await rooms.get(code))?.state;
    if (!state || state.phase === "closed") return failure("not_found");
    if (!seated(state, me.id)) return failure("not_member");
    if (state.phase !== "picking") return failure("wrong_phase");
    // past the clock the draft would be refused anyway: store no orphan picture
    if (state.deadline !== null && Date.now() >= state.deadline)
      return failure("wrong_phase");
    const mine = Object.values(state.assignments).find(
      (a) => a.pickerId === me.id,
    );
    if (!mine) return failure("not_member");
    if (mine.character) return failure("already_done");
    const character = characterId ? await characters.get(characterId) : null;
    if (characterId && !character) return failure("not_found");
    const picture = await sendPicture(me, character?.id ?? null, image);
    const replaces = form?.get("replaces");
    if (typeof replaces === "string" && replaces.length <= 64)
      await withdrawPicture(replaces, me.id).catch((e: unknown) =>
        console.warn("[pictures] replaced picture kept:", e),
      );
    await saveDraft(code, me.id, (current) =>
      character
        ? {
            characterId: character.id,
            name:
              current?.characterId === character.id
                ? current.name
                : character.name,
            imageUrl: picture.url,
          }
        : {
            characterId: null,
            name: current?.name ?? "",
            imageUrl: picture.url,
          },
    );
    const body: { imageUrl: string; picture: TrayPicture } = {
      imageUrl: picture.url,
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
