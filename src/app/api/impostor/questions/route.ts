import { getBackend } from "@/server/backend";

/**
 * The Impostor's live questions in every language, with their options: the
 * match keeps only ids, the screens read the words here. The same for
 * everyone and changed only in the database, so browsers keep it ten
 * minutes and CDNs an hour.
 */
export async function GET() {
  const questions = await getBackend().questions.list();
  return Response.json(
    { questions },
    {
      headers: {
        "Cache-Control":
          "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
