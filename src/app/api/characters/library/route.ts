import { LANGS, type Lang } from "@/game/types";
import { libraryItems } from "@/server/library";

/**
 * The whole starter library of one language, ready to search in the browser.
 * Identical for everyone and only changes with a deploy, so CDNs and browsers
 * keep it (a new deploy starts with an empty CDN cache).
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("lang") ?? "";
  if (!(LANGS as readonly string[]).includes(raw))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  return Response.json(
    { items: libraryItems(raw as Lang) },
    {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=31536000, stale-while-revalidate=86400",
      },
    },
  );
}
