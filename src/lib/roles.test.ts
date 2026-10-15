import { describe, expect, it } from "vitest";
import { can, roleOf } from "./roles";

const account = (role: "player" | "curator" | "admin") => ({
  isGuest: false,
  role,
});

describe("roles", () => {
  it("lets the admin do all a curator does", () => {
    expect(can(account("admin"), "admin")).toBe(true);
    expect(can(account("admin"), "curate")).toBe(true);
    expect(can(account("curator"), "curate")).toBe(true);
    expect(can(account("curator"), "admin")).toBe(false);
    expect(can(account("player"), "curate")).toBe(false);
  });

  it("gives a guest no role, whatever it carries", () => {
    expect(roleOf({ isGuest: true, role: "admin" })).toBeNull();
    expect(can({ isGuest: true, role: "admin" }, "admin")).toBe(false);
    expect(can(null, "curate")).toBe(false);
  });
});
