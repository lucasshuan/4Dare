import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import { themeRanking } from "@/server/rooms";
import { buildHand, type HandResponse } from "@/server/theme-picks";

/** A theme's id, as themeId() writes it: "famous-duos". */
const THEME_ID = /^[a-z0-9-]{1,80}$/;

/**
 * The hand of suggestions under the pick card: up to 8 characters for the
 * theme in `lang`, its best fits for that language's players (history and
 * starters, see rankTheme). The same for everyone (no viewer, no match), so
 * CDNs keep it a minute. A typed theme has no id the pick screen asks for,
 * and an unknown id simply has an empty hand.
 */
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/themes/[id]/picks">,
) {
  const { id } = await ctx.params;
  const raw = new URL(request.url).searchParams.get("lang") ?? "";
  if (!THEME_ID.test(id) || !(LANGS as readonly string[]).includes(raw))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  const lang = raw as Lang;
  const { characters } = getBackend();
  const body: HandResponse = {
    hand: await buildHand(await themeRanking(id, lang), lang, (ids) =>
      characters.getMany(ids, lang),
    ),
  };
  return Response.json(body, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
