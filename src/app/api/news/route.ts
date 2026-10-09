import { handle, langParam, noStore } from "@/server/http";
import { newsPage } from "@/server/news";

/** Every news post in `?lang=`, with its reactions and the reader's own (`NewsPage`). */
export async function GET(request: Request) {
  return handle(async () =>
    Response.json(await newsPage(langParam(request)), { headers: noStore }),
  );
}
