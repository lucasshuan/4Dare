import { describe, expect, it } from "vitest";
import {
  ensureGuest,
  GUEST_COOKIE,
  newGuest,
  openGuest,
  sealGuest,
} from "./guest";

describe("guest cookie", () => {
  it("opens what it sealed", () => {
    const guest = newGuest();
    expect(openGuest(sealGuest(guest))).toEqual(guest);
  });

  it("refuses a cookie someone changed", () => {
    const sealed = sealGuest(newGuest());
    const [payload, signature] = sealed.split(".");
    const other = { ...newGuest(), guestNumber: 1 };
    const forged = Buffer.from(JSON.stringify(other)).toString("base64url");
    expect(openGuest(`${forged}.${signature}`)).toBeNull();
    expect(openGuest(`${payload}.x${signature.slice(1)}`)).toBeNull();
    expect(openGuest("garbage")).toBeNull();
    expect(openGuest(undefined)).toBeNull();
  });

  it("makes a guest once and then keeps it", () => {
    const jar = new Map<string, string>();
    const cookies = {
      get: (name: string) =>
        jar.has(name) ? { value: jar.get(name) as string } : undefined,
      set: (name: string, value: string) => void jar.set(name, value),
    };
    const first = ensureGuest(cookies);
    expect(jar.has(GUEST_COOKIE)).toBe(true);
    expect(ensureGuest(cookies)).toEqual(first);
  });
});
