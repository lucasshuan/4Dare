import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("lang");
  const lang: Lang = (LANGS as readonly string[]).includes(raw ?? "")
    ? (raw as Lang)
    : "en";
  const me = await getBackend().auth.me(lang);
  return Response.json(me, { headers: { "Cache-Control": "no-store" } });
}
