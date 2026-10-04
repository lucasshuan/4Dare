import "server-only";
// Small helpers for the route handlers that change something (drafts, chat):
// Server Actions check the origin for free, routes have to do it themselves.
import { type ErrorCode, GameError } from "@/game/types";

export const noStore = { "Cache-Control": "no-store" };

/**
 * True when the request comes from one of our own pages. Browsers send Origin
 * on every POST and PUT (beacons and keepalive fetches too); without it, only
 * a same-origin fetch metadata header (or none, from a script) is let through.
 * The guest cookie is sameSite "lax" besides, so other sites never carry it.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    const site = request.headers.get("sec-fetch-site");
    return site === null || site === "same-origin" || site === "none";
  }
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const STATUS: Partial<Record<ErrorCode, number>> = {
  not_found: 404,
  not_member: 403,
  unauthorized: 403,
  invalid_input: 400,
  upload_failed: 400,
  rate_limited: 429,
  wrong_phase: 409,
  already_done: 409,
  conflict: 409,
  too_early: 409,
};

/** `{ error }` with the status that fits the code, never cached. */
export function failure(code: ErrorCode): Response {
  return Response.json(
    { error: code },
    { status: STATUS[code] ?? 400, headers: noStore },
  );
}

/** Runs a route's work; a GameError becomes its `{ error }` answer, anything else a 500. */
export async function handle(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work();
  } catch (e) {
    if (e instanceof GameError) return failure(e.code);
    console.error("[route]", e);
    return Response.json(
      { error: "unknown" },
      { status: 500, headers: noStore },
    );
  }
}

/** The request's JSON body, or invalid_input. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new GameError("invalid_input");
  }
}
