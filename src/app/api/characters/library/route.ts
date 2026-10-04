import { LANGS, type Lang } from "@/game/types";
import { libraryItems } from "@/server/library";

/**
 * The whole library of one language, ready to search in the browser.
 * Identical for everyone, but it changes without a deploy (it lives in the
 * database), so browsers keep it an hour and CDNs a day, then serve the old
 * copy while they fetch the new one.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("lang") ?? "";
  if (!(LANGS as readonly string[]).includes(raw))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  return Response.json(
    { items: await libraryItems(raw as Lang) },
    {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
