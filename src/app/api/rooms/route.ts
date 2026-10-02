import { getBackend } from "@/server/backend";

export async function GET() {
  const rooms = await getBackend().rooms.listPublic();
  return Response.json({ rooms }, { headers: { "Cache-Control": "no-store" } });
}
