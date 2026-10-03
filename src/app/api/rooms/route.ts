import { getBackend } from "@/server/backend";

/**
 * Every listed room. The list is the same for everyone, so the CDN keeps it
 * for a moment: however many people watch it, the function runs about once
 * every couple of seconds per region. A change pings the browsers with its
 * time, and they ask for `?v=<time>`, a fresh copy nobody has cached yet.
 */
export async function GET() {
  const rooms = await getBackend().rooms.listPublic();
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
