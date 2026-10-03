import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "@/server/backend";
import { currentMatch } from "@/server/rooms";

/** The match the caller is playing, if any: `{ match: CurrentMatch | null }`. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("lang");
  const lang: Lang = (LANGS as readonly string[]).includes(raw ?? "")
    ? (raw as Lang)
    : "en";
  const { id } = await getBackend().auth.identity(lang);
  const match = await currentMatch(id);
  return Response.json({ match }, { headers: { "Cache-Control": "no-store" } });
}
