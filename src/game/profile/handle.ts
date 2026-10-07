// The @handle of a profile's link (/u/<handle>): 3 to 20 of a-z, 0-9 and _,
// one per account. Names may repeat; handles may not.

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
/** Days between two changes of one's handle. @public */
export const HANDLE_CHANGE_DAYS = 30;

const SHAPE = /^[a-z0-9_]+$/;

/** Taken by the site's own pages and words that would mislead. */
const RESERVED = new Set([
  "4dare",
  "account",
  "admin",
  "anonymous",
  "anon",
  "api",
  "auth",
  "dare",
  "convidado",
  "guest",
  "help",
  "me",
  "mod",
  "moderator",
  "null",
  "official",
  "profile",
  "root",
  "settings",
  "staff",
  "support",
  "system",
  "undefined",
]);

export type HandleProblem = "short" | "long" | "chars" | "reserved";

/** What is wrong with a handle someone typed, or null when it may be taken. */
export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_MIN) return "short";
  if (handle.length > HANDLE_MAX) return "long";
  if (!SHAPE.test(handle)) return "chars";
  if (RESERVED.has(handle)) return "reserved";
  return null;
}

/** A handle typed with capitals or spaces, as it would be kept. */
export const normalizeHandle = (raw: string) =>
  raw.trim().toLowerCase().replace(/^@/, "");

/** A name as a handle: accents off, only a-z, 0-9 and _ kept, at most 16. */
export function slugHandle(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 16);
}

/**
 * Handles to try for a new account, best first: the name as it is, then the
 * name with a piece of the account's id (as migration 0030 gave the accounts
 * that came before).
 */
export function handleCandidates(name: string | null, id: string): string[] {
  const base = slugHandle(name ?? "") || "player";
  const hex = id.replace(/[^0-9a-f]/gi, "").toLowerCase();
  const out = handleProblem(base) ? [] : [base];
  for (const n of [6, 8, 12]) {
    const stem = base.padEnd(HANDLE_MIN, "_").slice(0, HANDLE_MAX - 1 - n);
    out.push(`${stem}_${hex.slice(0, n)}`);
  }
  return out;
}
