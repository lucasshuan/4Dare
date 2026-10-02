import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import type { CharacterSearchResponse } from "@/server/contract";
import { allow } from "@/server/rate-limit";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").slice(0, 60);
  const raw = params.get("lang");
  const lang: Lang = (LANGS as readonly string[]).includes(raw ?? "")
    ? (raw as Lang)
    : "en";
  const { characters, auth } = getBackend();
  const me = await auth.me(lang);
  if (!allow(`search:${me.id}`, 240, 60_000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const found = await characters.search(q, lang, 6);
  const body: CharacterSearchResponse = {
    results: found.map(({ id, lang: l, name, origin, imageUrl }) => ({
      id,
      lang: l,
      name,
      origin,
      imageUrl,
    })),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
