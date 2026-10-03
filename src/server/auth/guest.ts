import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { randomGuestNumber } from "@/game/guest-names";
import type { Avatar } from "@/game/types";
import { randomAvatar } from "../backend/pastel";

/**
 * Guests live only in this cookie: a random id, the number behind their
 * generated name and their critter, signed by the server so nobody can pose
 * as another guest. Nothing about a guest is stored in the database; the
 * matches they play keep the id, and move to their account when they sign in.
 */
export const GUEST_COOKIE = "dare_guest";
const MAX_AGE = 60 * 60 * 24 * 365;

export interface Guest {
  id: string;
  guestNumber: number;
  avatar: Avatar;
}

function secret() {
  const key =
    process.env.GUEST_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Local mode has no secret: the cookie is only a convenience there.
  return key || "dare-local-guests";
}

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(`guest:${payload}`).digest("base64url");

export function newGuest(): Guest {
  return {
    id: randomUUID(),
    guestNumber: randomGuestNumber(),
    avatar: randomAvatar(),
  };
}

/** `<base64url json>.<signature>` */
export function sealGuest(guest: Guest): string {
  const payload = Buffer.from(JSON.stringify(guest)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

const UUID = /^[0-9a-f-]{36}$/;

/** The guest, if the value was signed by this server and well formed; null otherwise. */
export function openGuest(value: string | undefined): Guest | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = value.slice(0, dot);
  const given = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null;
  try {
    const g = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const ok =
      typeof g?.id === "string" &&
      UUID.test(g.id) &&
      Number.isInteger(g.guestNumber) &&
      typeof g.avatar?.color === "string";
    return ok ? (g as Guest) : null;
  } catch {
    return null;
  }
}

export const guestCookieOptions = (secure: boolean) =>
  ({
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: MAX_AGE,
  }) as const;

interface CookieJar {
  get(name: string): { value: string } | undefined;
  set(
    name: string,
    value: string,
    options: ReturnType<typeof guestCookieOptions>,
  ): unknown;
}

/**
 * The same guest (same id, so the same seats and matches) with a new random
 * name and critter. Null when there is no guest cookie to change.
 */
export function rerollGuest(
  jar: CookieJar,
  secure = process.env.NODE_ENV === "production",
): Guest | null {
  const current = openGuest(jar.get(GUEST_COOKIE)?.value);
  if (!current) return null;
  const fresh = newGuest();
  const guest: Guest = {
    id: current.id,
    guestNumber: fresh.guestNumber,
    avatar: fresh.avatar,
  };
  jar.set(GUEST_COOKIE, sealGuest(guest), guestCookieOptions(secure));
  return guest;
}

/**
 * The caller's guest, made on first contact. The proxy makes it on the first
 * page, before the browser fires its parallel requests; this is the fallback
 * for callers that skip pages (tests, a stale tab after the cookie expired).
 */
export function ensureGuest(
  jar: CookieJar,
  secure = process.env.NODE_ENV === "production",
): Guest {
  const current = openGuest(jar.get(GUEST_COOKIE)?.value);
  if (current) return current;
  const guest = newGuest();
  try {
    jar.set(GUEST_COOKIE, sealGuest(guest), guestCookieOptions(secure));
  } catch {
    // Server components cannot write cookies; route handlers and actions can.
  }
  return guest;
}
