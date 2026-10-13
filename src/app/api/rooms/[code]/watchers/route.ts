import { displayName } from "@/game/guest-names";
import { GameError, WATCHERS_SHOWN, type WatchersView } from "@/game/types";
import { getBackend } from "@/server/backend";
import { failure, handle, langParam, noStore } from "@/server/http";
import { normalizeCode } from "@/server/rooms";
import { watcherIn } from "@/server/watchers";

/**
 * Who watches the room, for whoever is in it (seated or watching), names in
 * `?lang=`: the first WATCHERS_SHOWN in the host's order, and how many in
 * all. Apart from the room's view, so someone coming in to watch never makes
 * every page read the whole room again.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/watchers">,
) {
  return handle(async () => {
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const { rooms, auth, watchers } = getBackend();
    const now = Date.now();
    const [stored, me, list] = await Promise.all([
      rooms.get(code),
      auth.identity("en"),
      watchers.list(code, WATCHERS_SHOWN, now),
    ]);
    if (!stored || stored.state.phase === "closed")
      throw new GameError("not_found");
    const inside =
      stored.state.players.some((p) => p.id === me.id) ||
      list.watchers.some((w) => w.person.id === me.id) ||
      !!(await watcherIn(code, me.id));
    if (!inside) throw new GameError("not_member");
    const lang = langParam(request);
    const body: WatchersView = {
      total: list.total,
      watchers: list.watchers.map(({ person }) => ({
        id: person.id,
        isYou: person.id === me.id,
        isGuest: person.isGuest,
        name: displayName(person, lang),
        avatar: person.avatar,
      })),
    };
    return Response.json(body, { headers: noStore });
  });
}
