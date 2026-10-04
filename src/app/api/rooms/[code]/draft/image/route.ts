import { getBackend } from "@/server/backend";
import { failure, handle, noStore, sameOrigin } from "@/server/http";
import { readImage } from "@/server/images";
import { allow } from "@/server/rate-limit";
import { normalizeCode, saveDraft, seated } from "@/server/rooms";

/**
 * A picture for the new character on the caller's pick card (multipart field
 * `image`, cropped 4:5 by the browser). It is stored, put on the card's draft
 * with the name typed so far, and its URL comes back: `{ imageUrl }`. The
 * card is a new character from then on; a library character's picture is
 * changed through replaceCharacterImage instead.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/draft/image">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const { auth, rooms, files } = getBackend();
    const me = await auth.identity("en");
    // the same budget as every other picture a player sends
    if (!allow(`upload:${me.id}`, 30, 60_000)) return failure("rate_limited");
    const form = await request.formData().catch(() => null);
    const image = form ? await readImage(form.get("image")) : null;
    if (!image) return failure("invalid_input");
    // Only a picker with a card still open stores anything.
    const state = (await rooms.get(code))?.state;
    if (!state || state.phase === "closed") return failure("not_found");
    if (!seated(state, me.id)) return failure("not_member");
    if (state.phase !== "picking") return failure("wrong_phase");
    const mine = Object.values(state.assignments).find(
      (a) => a.pickerId === me.id,
    );
    if (!mine) return failure("not_member");
    if (mine.character) return failure("already_done");
    const imageUrl = await files.put("characters", image.bytes, image.type);
    await saveDraft(code, me.id, (current) => ({
      characterId: null,
      name: current?.name ?? "",
      imageUrl,
    }));
    return Response.json({ imageUrl }, { headers: noStore });
  });
}
