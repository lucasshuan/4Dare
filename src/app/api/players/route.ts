import { getBackend } from "@/server/backend";
import { playersPage } from "@/server/community";
import { failure, handle, langParam, noStore } from "@/server/http";
import { allow } from "@/server/rate-limit";

/** People to play with: `?q=` (name or handle), `?filter=all|with|now`, `?offset=`, in `?lang=`. */
export async function GET(request: Request) {
  return handle(async () => {
    const me = await getBackend().auth.identity("en");
    if (!allow(`players:${me.id}`, 60, 60_000)) return failure("rate_limited");
    const p = new URL(request.url).searchParams;
    const filter = p.get("filter");
    const page = await playersPage(
      (p.get("q") ?? "").slice(0, 40),
      filter === "with" || filter === "now" ? filter : "all",
      Math.max(0, Math.min(3000, Number(p.get("offset")) || 0)),
      langParam(request),
    );
    return Response.json(page, { headers: noStore });
  });
}
