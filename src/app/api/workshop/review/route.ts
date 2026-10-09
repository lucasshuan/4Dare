import { handle, langParam, noStore } from "@/server/http";
import { reviewQueue } from "@/server/workshop";

/** The curators' queue: suggestions up for votes, most wanted first. */
export async function GET(request: Request) {
  return handle(async () =>
    Response.json(
      { queue: await reviewQueue(langParam(request)) },
      { headers: noStore },
    ),
  );
}
