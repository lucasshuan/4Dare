import { searchItems } from "@/game/character-search";
import { LANGS, type Lang } from "@/game/types";
import type { CharacterSearchResponse } from "@/server/contract";
import { searchableItems } from "@/server/library";
import { allow } from "@/server/rate-limit";

/**
 * Server-side search, used only until the browser has the library index
 * (see /api/characters/library). Same ranking, in memory, no database.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").slice(0, 60);
  const raw = params.get("lang") ?? "";
  const lang: Lang = (LANGS as readonly string[]).includes(raw)
    ? (raw as Lang)
    : "en";
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!allow(`search:${ip ?? "local"}`, 240, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const body: CharacterSearchResponse = {
    results: searchItems(await searchableItems(lang), q, 6).map((r) => ({
      ...r,
      lang,
    })),
  };
  return Response.json(body, {
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=15, stale-while-revalidate=60",
    },
  });
}
