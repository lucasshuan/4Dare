import { getBackend } from "@/server/backend";
import { langParam, noStore } from "@/server/http";
import { showMe } from "@/server/shown";

/** The caller, their guest name in `?lang=`. */
export async function GET(request: Request) {
  const lang = langParam(request);
  const me = showMe(await getBackend().auth.me(lang), lang);
  return Response.json(me, { headers: noStore });
}
