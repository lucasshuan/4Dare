import { getBackend } from "@/server/backend";
import { handle, langParam, noStore } from "@/server/http";

/** How far back the home's garden strip reads: a week, and a day to spare for time zones. */
const WEEK_MS = 8 * 24 * 60 * 60 * 1000;

/**
 * The caller's XP and their matches of the last week, for the home's pass
 * card: `{ week: MeWeek | null }`, null for a guest.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const backend = getBackend();
    const me = await backend.auth.me(langParam(request));
    if (me.isGuest) return Response.json({ week: null }, { headers: noStore });
    const [totals, history] = await Promise.all([
      backend.matches.totals(me.id),
      backend.matches.history(me.id, Date.now() - WEEK_MS),
    ]);
    return Response.json(
      {
        week: {
          xp: totals.xp,
          plays: history.map((m) => ({
            at: m.finishedAt,
            game: m.game,
            won: m.place === 1,
          })),
        },
      },
      { headers: noStore },
    );
  });
}
