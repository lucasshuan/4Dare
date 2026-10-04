import { critterSvg } from "@/server/critter-art";

/**
 * /api/critter/<seed>/<rrggbb>: the creature for that seed on that pastel, as
 * SVG. The same address always draws the same creature, so browsers keep it a
 * week and the CDN a year (a deploy clears the CDN).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/critter/[seed]/[bg]">,
) {
  const { seed, bg } = await ctx.params;
  if (!seed || seed.length > 64 || !/^[0-9a-f]{6}$/.test(bg))
    return new Response(null, { status: 404 });
  return new Response(critterSvg(seed, `#${bg}`), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, s-maxage=31536000",
    },
  });
}
