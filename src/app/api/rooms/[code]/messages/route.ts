import { CHAT_PAGE, chatPerson, cleanChatText } from "@/game/chat";
import { showLine } from "@/game/shown";
import { GameError, type PlayerId } from "@/game/types";
import { getBackend } from "@/server/backend";
import { background } from "@/server/background";
import {
  failure,
  handle,
  langParam,
  noStore,
  readJson,
  sameOrigin,
} from "@/server/http";
import { allow } from "@/server/rate-limit";
import { normalizeCode } from "@/server/rooms";

/** Most lines one refetch brings (it asks from the newest line's time minus a small overlap). */
const SINCE_LIMIT = 200;

/** The caller's seat in an open room: 404 for a missing or closed room, 403 off it. No timeouts fire here: kept cheap. */
async function seatOf(code: string, id: Promise<PlayerId>) {
  const [stored, me] = await Promise.all([getBackend().rooms.get(code), id]);
  if (!stored || stored.state.phase === "closed")
    throw new GameError("not_found");
  const seat = stored.state.players.find((p) => p.id === me);
  if (!seat) throw new GameError("not_member");
  return seat;
}

const callerId = async () => (await getBackend().auth.identity("en")).id;

/**
 * The room's chat, for its players, names in `?lang=`. `?since=<ms>`: the lines created from
 * then on (the browser asks from its newest line's time minus a few seconds
 * and merges by id, since ids can commit out of order); without it, the last
 * CHAT_PAGE. Lines still waiting for their scene come too: the browser hides
 * them until `showAt`, and the room view already carries what they say.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/messages">,
) {
  return handle(async () => {
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const raw = new URL(request.url).searchParams.get("since");
    const since = raw === null || raw === "" ? null : Number(raw);
    if (since !== null && !Number.isFinite(since))
      return failure("invalid_input");
    await seatOf(code, callerId());
    const { chat } = getBackend();
    const messages =
      since === null
        ? await chat.list(code, 0, CHAT_PAGE)
        : await chat.list(code, since, SINCE_LIMIT);
    const lang = langParam(request);
    return Response.json(
      { messages: messages.map((m) => showLine(m, lang)) },
      { headers: noStore },
    );
  });
}

/**
 * Posts `{ text }` as the caller, who must sit in the room and not have left
 * the match. A route rather than a Server Action: actions run one at a time
 * per tab, and a line must not wait behind an upload or a confirm. The room
 * hears an id-only "chat" ping; the sender gets the saved line back, to
 * replace the one it showed at once.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/rooms/[code]/messages">,
) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const code = normalizeCode((await ctx.params).code);
    if (!code) return failure("not_found");
    const id = callerId();
    const me = await id;
    // a cheap first line, per instance; the store holds the real limit
    if (!allow(`chat:${me}`, 5, 10_000) || !allow(`chat-min:${me}`, 30, 60_000))
      return failure("rate_limited");
    const body = await readJson(request);
    const text = cleanChatText(
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { text?: unknown }).text
        : null,
    );
    if (text === null) return failure("invalid_input");
    const seat = await seatOf(code, id);
    if (seat.away) return failure("not_member");
    const { chat, notify } = getBackend();
    const [message] = await chat.add(code, [
      { by: me, author: chatPerson(seat), text },
    ]);
    background(() => notify.chatChanged(code, message.id));
    return Response.json(showLine(message, langParam(request)), {
      headers: noStore,
    });
  });
}
