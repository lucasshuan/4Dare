import { playersOnline } from "@/game/view";
import { getBackend } from "@/server/backend";

/** Rooms quiet for longer than this count nobody (see playersOnline). */
const WINDOW_MS = 20 * 60_000;

/**
 * Players online per game: `{ online: { "who-am-i": 12 } }`. Same for
 * everyone, so the CDN keeps it for a moment, like the room list; a room
 * change pings the browsers, and they ask for `?v=<time>`.
 */
export async function GET() {
  const now = Date.now();
  const rooms = await getBackend().rooms.listActive(now - WINDOW_MS);
  return Response.json(
    { online: playersOnline(rooms, now) },
    {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=2, stale-while-revalidate=10",
      },
    },
  );
}
