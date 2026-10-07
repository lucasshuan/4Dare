import { getBackend } from "@/server/backend";
import type { ThemeCatalogEntry } from "@/server/contract";

/**
 * Every theme with what the room setup needs: its names, set, the games it
 * serves and its starters' gostos (to know what the room's gostos leave). The
 * same for everyone and changed only in the database, so browsers keep it ten
 * minutes and CDNs an hour.
 */
export async function GET() {
  const list = await getBackend().themes.catalog();
  const themes: ThemeCatalogEntry[] = list.map(
    ({ id, set, games, gostos, en, es, ja, pt }) => ({
      id,
      set,
      games,
      gostos,
      names: { en, es, ja, pt },
    }),
  );
  return Response.json(
    { themes },
    {
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
