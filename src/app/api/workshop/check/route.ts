import { getBackend } from "@/server/backend";
import {
  failure,
  handle,
  langParam,
  noStore,
  readJson,
  sameOrigin,
} from "@/server/http";
import { allow } from "@/server/rate-limit";
import { checkDraft, parseDraft } from "@/server/workshop";

/**
 * The composer's live check, while someone types: `{ draft }` in, `{ checks }`
 * out (empty when nothing blocks it). A draft not finished yet checks nothing.
 */
export async function POST(request: Request) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const me = await getBackend().auth.identity("en");
    if (!allow(`workshop-check:${me.id}`, 60, 60_000))
      return failure("rate_limited");
    const body = (await readJson(request)) as { draft?: unknown } | null;
    let draft: ReturnType<typeof parseDraft>;
    try {
      draft = parseDraft(body?.draft);
    } catch {
      return Response.json({ checks: [] }, { headers: noStore });
    }
    const checks = await checkDraft(draft, langParam(request));
    return Response.json({ checks }, { headers: noStore });
  });
}
