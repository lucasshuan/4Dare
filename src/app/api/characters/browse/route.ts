import { isTaste } from "@/game/tastes";
import { browse } from "@/server/catalog";
import {
  LIBRARY_NEEDS,
  LIBRARY_SORTS,
  type LibraryNeed,
  type LibrarySort,
} from "@/server/community-contract";
import { handle, langParam } from "@/server/http";

const oneOf = <T extends string>(list: readonly T[], v: string | null) =>
  (list as readonly string[]).includes(v ?? "") ? (v as T) : null;

/**
 * One page of the characters page's list, in `?lang=`: `?q=` (name, work or
 * nickname), `?taste=`, `?sort=top|new|nopic`, `?need=missing|unreviewed`,
 * `?offset=`. The same for everyone, so the CDN keeps it a minute.
 */
export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const p = url.searchParams;
    const taste = p.get("taste");
    const page = await browse(
      {
        q: (p.get("q") ?? "").slice(0, 80),
        taste: isTaste(taste) ? taste : null,
        sort: oneOf<LibrarySort>(LIBRARY_SORTS, p.get("sort")) ?? "top",
        need: oneOf<LibraryNeed>(LIBRARY_NEEDS, p.get("need")),
        offset: Math.max(0, Math.min(20_000, Number(p.get("offset")) || 0)),
      },
      langParam(request),
    );
    return Response.json(page, {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  });
}
