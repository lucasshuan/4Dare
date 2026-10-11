import { helperBoard, helperPeriod } from "@/server/community";
import { handle, langParam } from "@/server/http";

/** Who helped the library most: `?period=week|month|ever` (this month by default), in `?lang=`. The same for everyone: the CDN keeps it a minute. */
export async function GET(request: Request) {
  return handle(async () => {
    const period = helperPeriod(new URL(request.url).searchParams);
    return Response.json(await helperBoard(period, langParam(request)), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  });
}
