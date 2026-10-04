import { GameError, MAX_CHARACTER_NAME, type PlayerId } from "@/game/types";
import { getBackend } from "@/server/backend";
import { failure, handle, noStore, readJson, sameOrigin } from "@/server/http";
import { usablePicture } from "@/server/pictures";
import { allow } from "@/server/rate-limit";
import { type DraftCard, normalizeCode, saveDraft } from "@/server/rooms";

/**
 * The card as the browser sends it, or null for an empty card:
 * `{ characterId: string | null, name: string, imageUrl: string | null }`.
 * A picture must be one of the character's the player can see or, for a new
 * name, one they sent (see draft/image).
 */
async function parseCard(
  body: unknown,
  playerId: PlayerId,
): Promise<DraftCard | null> {
  if (body === null) return null;
  if (typeof body !== "object" || Array.isArray(body))
    throw new GameError("invalid_input");
  const { characterId, name, imageUrl } = body as Record<string, unknown>;
  const ok =
    typeof name === "string" &&
    name.length <= MAX_CHARACTER_NAME &&
    (characterId === null ||
      (typeof characterId === "string" &&
        characterId.length > 0 &&
        characterId.length <= 200)) &&
    (imageUrl === null ||
      (typeof imageUrl === "string" && imageUrl.length <= 500));
  if (!ok) throw new GameError("invalid_input");
  if (
    typeof imageUrl === "string" &&
    !(await usablePicture(playerId, characterId as string | null, imageUrl))
  )
    throw new GameError("invalid_input");
  return {
    characterId: characterId as string | null,
    name: name as string,
    imageUrl: imageUrl as string | null,
  };
}

/**
 * Saves what is on the caller's pick card while they edit it: if the clock
 * runs out, whatever is on the card is the pick. A route rather than a Server
 * Action, since actions run one at a time per tab and autosaves would queue in
 * front of Confirm. Quiet: nobody else hears of it. 204 when saved.
 */
export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/draft">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const me = await getBackend().auth.identity("en");
    if (!allow(`draft:${me.id}`, 120, 60_000)) return failure("rate_limited");
    const card = await parseCard(await readJson(request), me.id);
    await saveDraft(code, me.id, card);
    return new Response(null, { status: 204, headers: noStore });
  });
}
