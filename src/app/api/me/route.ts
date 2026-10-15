import { getBackend } from "@/server/backend";
import { langParam, noStore } from "@/server/http";
import { noticeFor } from "@/server/sanctions";
import { showMe } from "@/server/shown";

/** The caller, their guest name in `?lang=`. */
export async function GET(request: Request) {
  const lang = langParam(request);
  const account = await getBackend().auth.me(lang);
  const me = { ...showMe(account, lang), notice: await noticeFor(account.id) };
  return Response.json(me, { headers: noStore });
}
