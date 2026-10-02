import type { NextRequest, NextResponse } from "next/server";

// CONTRACT: called by src/proxy.ts on every page request.
// Local mode: nothing to do. Supabase mode: refresh the auth cookies on `response`.
export async function refreshSession(
  _request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  return response;
}
