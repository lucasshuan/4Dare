import { getBackend } from "@/server/backend";
import { WORKSHOP_KINDS, type WorkshopKind } from "@/server/community-contract";
import {
  failure,
  handle,
  langParam,
  noStore,
  readJson,
  sameOrigin,
} from "@/server/http";
import { allow } from "@/server/rate-limit";
import { wand } from "@/server/workshop-wand";

/**
 * The translation wand: `{ kind, pieces }` written in `?lang=` in, the three
 * other languages out (`WandResult`). Accounts only, a few presses a minute.
 */
export async function POST(request: Request) {
  return handle(async () => {
    if (!sameOrigin(request)) return failure("unauthorized");
    const me = await getBackend().auth.identity("en");
    if (me.isGuest) return failure("sign_in_needed");
    if (!allow(`wand:${me.id}`, 8, 60_000)) return failure("rate_limited");
    const body = (await readJson(request)) as {
      kind?: unknown;
      pieces?: unknown;
    } | null;
    const kind = body?.kind as WorkshopKind;
    if (!WORKSHOP_KINDS.includes(kind)) return failure("invalid_input");
    const raw = (body?.pieces ?? {}) as Record<string, unknown>;
    const pieces = Object.fromEntries(
      Object.entries(raw)
        .filter(
          ([k, v]) =>
            /^(name|text|low|high|c[0-3])$/.test(k) && typeof v === "string",
        )
        .map(([k, v]) => [k, (v as string).slice(0, 90)]),
    );
    if (!Object.keys(pieces).length) return failure("invalid_input");
    return Response.json(await wand(kind, langParam(request), pieces), {
      headers: noStore,
    });
  });
}
