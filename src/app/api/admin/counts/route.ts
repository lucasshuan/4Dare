import { adminCounts } from "@/server/admin/overview";
import { handle, noStore } from "@/server/http";

/** What waits on the admin (`AdminCounts`): per person, so never cached. */
export async function GET() {
  return handle(async () =>
    Response.json(await adminCounts(), { headers: noStore }),
  );
}
