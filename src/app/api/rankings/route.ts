import { GAME_KEYS, type GameKey } from "@/game/games";
import { rankingPage } from "@/server/community";
import type { RankingPeriod } from "@/server/community-contract";
import { handle, langParam, noStore } from "@/server/http";

/** The XP ranking: `?game=` (none for all), `?period=week|month|ever`, in `?lang=`; the reader's own place too. */
export async function GET(request: Request) {
  return handle(async () => {
    const p = new URL(request.url).searchParams;
    const game = p.get("game");
    const period = p.get("period");
    const page = await rankingPage(
      (GAME_KEYS as readonly string[]).includes(game ?? "")
        ? (game as GameKey)
        : null,
      period === "month" || period === "ever"
        ? period
        : ("week" as RankingPeriod),
      langParam(request),
    );
    return Response.json(page, { headers: noStore });
  });
}
