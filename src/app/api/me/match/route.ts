import { getBackend } from "@/server/backend";
import { langParam, noStore } from "@/server/http";
import { currentMatch } from "@/server/rooms";

/** The match the caller is playing, if any: `{ match: CurrentMatch | null }`. */
export async function GET(request: Request) {
  const { id } = await getBackend().auth.identity(langParam(request));
  const match = await currentMatch(id);
  return Response.json({ match }, { headers: noStore });
}
