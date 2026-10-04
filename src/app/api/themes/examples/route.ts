import { themeExamples } from "@/server/theme-examples";

/**
 * Three example themes per set, in every language, for the set cards of the
 * room setup. The same for everyone and changed only in the database, so
 * browsers keep it an hour and CDNs a day.
 */
export async function GET() {
  return Response.json(
    { examples: await themeExamples() },
    {
      headers: {
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
