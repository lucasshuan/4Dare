import { LANGS, type Lang } from "@/game/types";
import { characterExtras } from "@/server/character-extras";

/** Characters players created and pictures they swapped: small, the same for everyone, cached for seconds. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("lang") ?? "";
  if (!(LANGS as readonly string[]).includes(raw))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  return Response.json(await characterExtras(raw as Lang), {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
    },
  });
}
