import { GOSTOS } from "@/game/gostos";
import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import type { LineupCatalog } from "@/server/contract";

/**
 * What for?'s live missions in every language and the deck of `?lang=`
 * (LineupCatalog): the room setup counts what a room's gostos and missions
 * leave. The same for everyone and changed only in the database, so
 * browsers keep it ten minutes and CDNs an hour.
 */
export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("lang");
  const lang: Lang = LANGS.includes(asked as Lang) ? (asked as Lang) : "en";
  const { lineup } = getBackend();
  const [bank, pool] = await Promise.all([
    lineup.missions(),
    lineup.pool(lang),
  ]);
  const deck = pool.map((c) =>
    GOSTOS.reduce(
      (m, g, i) => (c.gostos.includes(g.key) ? m | (1 << i) : m),
      0,
    ),
  );
  const cards: Record<string, number> = {};
  for (const mask of deck) cards[mask] = (cards[mask] ?? 0) + 1;
  const body: LineupCatalog = {
    missions: bank.map(({ id, tone, heavy, text }) => ({
      id,
      tone,
      heavy,
      text,
    })),
    deck,
    cards,
  };
  return Response.json(body, {
    headers: {
      "Cache-Control":
        "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
