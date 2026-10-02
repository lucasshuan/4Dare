import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * When a guest signs in to a Discord/Google account that already existed, the
 * user id changes. Their id crosses the provider round trip in this cookie,
 * signed with the server's secret, so nobody can claim another guest's matches.
 */
export const MERGE_COOKIE = "dare_merge";

function key() {
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return secret;
}

const sign = (id: string) =>
  createHmac("sha256", key()).update(`merge:${id}`).digest("base64url");

/** `<guest id>.<signature>` */
export const sealGuest = (id: string) => `${id}.${sign(id)}`;

/** The guest id, if the value was signed by this server; null otherwise. */
export function openGuest(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const id = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  return given.length === expected.length && timingSafeEqual(given, expected)
    ? id
    : null;
}
