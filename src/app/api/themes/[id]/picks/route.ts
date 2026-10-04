import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import {
  buildHand,
  type HandResponse,
  PICKS_FETCHED,
} from "@/server/theme-picks";

/** A theme's id, as themeId() writes it: "famous-duos". */
const THEME_ID = /^[a-z0-9-]{1,80}$/;

/**
 * The hand of suggestions under the pick card: up to 8 characters for the
 * theme in `lang`, what players picked and liked most first, then the theme's
 * starters (see buildHand). The same for everyone (no viewer, no match), so
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
  const { matches, characters } = getBackend();
  const [popular, starters] = await Promise.all([
    matches.popularPicks(id, PICKS_FETCHED),
    characters.starters(),
  ]);
  const body: HandResponse = {
    hand: await buildHand(
      popular,
      starters
        .filter((s) => s.themeId === id)
        .sort((a, b) => a.position - b.position)
        .map((s) => s.characterId),
      lang,
      (ids) => characters.getMany(ids, lang),
    ),
  };
  return Response.json(body, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
