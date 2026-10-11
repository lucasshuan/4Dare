import { rankingBoard, rankingQuery } from "@/server/community";
import { handle, langParam } from "@/server/http";

/** The XP ranking: `?game=` (none for all), `?period=week|month|ever`, in `?lang=`. The same for everyone: the CDN keeps it a minute. */
export async function GET(request: Request) {
  return handle(async () => {
    const { game, period } = rankingQuery(new URL(request.url).searchParams);
    return Response.json(await rankingBoard(game, period, langParam(request)), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  });
}
