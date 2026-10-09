import { contributionsPage } from "@/server/community";
import type { FeedFilter } from "@/server/community-contract";
import { handle, langParam, noStore } from "@/server/http";

const FILTERS: readonly FeedFilter[] = [
  "all",
  "picture",
  "alias",
  "character",
  "suggestion",
];

/** The contributions feed: `?kind=`, `?before=` (ms, for the next page), `?mine=1`, in `?lang=`; the reader's numbers too. */
export async function GET(request: Request) {
  return handle(async () => {
    const p = new URL(request.url).searchParams;
    const kind = p.get("kind") as FeedFilter;
    const before = Number(p.get("before"));
    const page = await contributionsPage(
      FILTERS.includes(kind) ? kind : "all",
      Number.isFinite(before) && before > 0 ? before : null,
      p.get("mine") === "1",
      langParam(request),
    );
    return Response.json(page, { headers: noStore });
  });
}
