import { showRoom } from "@/game/view";
import { getBackend } from "@/server/backend";
import { langParam } from "@/server/http";

/**
 * Every listed room. The list is the same for everyone, so the CDN keeps it
 * for a moment: however many people watch it, the function runs about once
 * every couple of seconds per region and language. A change pings the
 * browsers with its time, and they ask for `?v=<time>`, a fresh copy nobody
 * has cached yet. Hosts' names come in `?lang=`.
 */
export async function GET(request: Request) {
  const lang = langParam(request);
  const backend = getBackend();
  const listed = await backend.rooms.listPublic();
  // who watches each room without a seat; the list still shows if this fails
  const watching = await backend.watchers
    .counts(
      listed.map((r) => r.code),
      Date.now(),
    )
    .catch(() => ({}) as Record<string, number>);
  const rooms = listed.map((r) => showRoom(r, lang, watching[r.code] ?? 0));
  return Response.json(
    { rooms },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=10",
      },
    },
  );
}
