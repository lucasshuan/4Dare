import { getBackend } from "@/server/backend";
import { failure, handle, noStore } from "@/server/http";

/** The account box's facts: e-mail and linked providers (`AccountInfo`); 404 for a guest. */
export async function GET() {
  return handle(async () => {
    const info = await getBackend().auth.accountInfo();
    if (!info) return failure("not_found");
    return Response.json(info, { headers: noStore });
  });
}
