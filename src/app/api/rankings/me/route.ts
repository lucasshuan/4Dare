import { myRankingRow, rankingQuery } from "@/server/community";
import type { MyRankingRow } from "@/server/community-contract";
import { handle, langParam, noStore } from "@/server/http";

/** The reader's own row in the ranking of `?game=` and `?period=` (as /api/rankings), in `?lang=`. */
export async function GET(request: Request) {
  return handle(async () => {
    const { game, period } = rankingQuery(new URL(request.url).searchParams);
    const body: MyRankingRow = {
      me: await myRankingRow(game, period, langParam(request)),
    };
    return Response.json(body, { headers: noStore });
  });
}
