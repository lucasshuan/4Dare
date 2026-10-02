import { readFile } from "node:fs/promises";
import { dataPath } from "@/server/backend/local/disk";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  png: "image/png",
};
const SAFE = /^(characters|avatars)\/[0-9a-f-]{36}\.(webp|jpg|png)$/;

/** Local mode only: serves uploaded pictures from .data/uploads. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/files/[...path]">,
) {
  const rel = (await ctx.params).path.join("/");
  const match = SAFE.exec(rel);
  if (!match) return new Response("not found", { status: 404 });
  try {
    const bytes = await readFile(
      /* turbopackIgnore: true */ dataPath("uploads", rel),
    );
    return new Response(bytes, {
      headers: {
        "Content-Type": TYPES[match[2]],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
