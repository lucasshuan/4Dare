import { GAME_KEYS, type GameKey } from "@/game/games";
import { WORKSHOP_KINDS, type WorkshopKind } from "@/server/community-contract";
import { handle, langParam, noStore } from "@/server/http";
import { workshopPage } from "@/server/workshop";

const oneOf = <T extends string>(list: readonly T[], v: string | null) =>
  (list as readonly string[]).includes(v ?? "") ? (v as T) : null;

/**
 * One page of the Workshop in `?lang=`: `?game=`, `?kind=theme|question|mission`,
 * `?status=voting|live|refused`, `?mine=1`, `?q=` (searches what is live),
 * `?offset=`. Per reader (their votes, their own), so never cached.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const p = new URL(request.url).searchParams;
    const page = await workshopPage(
      {
        game: oneOf<GameKey>(GAME_KEYS, p.get("game")),
        kind: oneOf<WorkshopKind>(WORKSHOP_KINDS, p.get("kind")),
        status:
          oneOf(["voting", "live", "refused"] as const, p.get("status")) ??
          "voting",
        mine: p.get("mine") === "1",
        q: (p.get("q") ?? "").slice(0, 80),
        offset: Math.max(0, Math.min(5000, Number(p.get("offset")) || 0)),
      },
      langParam(request),
    );
    return Response.json(page, { headers: noStore });
  });
}
