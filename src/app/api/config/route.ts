import { loadConfig } from "@/server/config";
import { handle } from "@/server/http";

/** The panel's values in force (tune.ts), the same for everyone: the CDN keeps them a minute. */
export async function GET() {
  return handle(async () => {
    const c = await loadConfig();
    return Response.json(
      { v: c.v, tunes: c.values.tunes },
      {
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "CDN-Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=600",
        },
      },
    );
  });
}
