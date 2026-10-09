import { handle } from "@/server/http";
import { menuCounts } from "@/server/menu";

/** The side menu's numbers (`MenuCounts`), the same for everyone: the CDN keeps them a minute. */
export async function GET() {
  return handle(async () =>
    Response.json(await menuCounts(), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
      },
    }),
  );
}
