import { describe, expect, it } from "vitest";
import { adminHome, cookieDomain, isAdminHost, siteHome } from "./hosts";

describe("hosts", () => {
  it("knows the panel's host", () => {
    expect(isAdminHost("admin.4dare.com")).toBe(true);
    expect(isAdminHost("admin.localhost:3000")).toBe(true);
    expect(isAdminHost("www.4dare.com")).toBe(false);
    expect(isAdminHost(null)).toBe(false);
  });

  it("shares the auth cookies across 4dare.com only", () => {
    expect(cookieDomain("www.4dare.com")).toBe(".4dare.com");
    expect(cookieDomain("admin.4dare.com")).toBe(".4dare.com");
    expect(cookieDomain("4dare.com")).toBe(".4dare.com");
    expect(cookieDomain("localhost:3000")).toBeUndefined();
    expect(cookieDomain("dare-phi.vercel.app")).toBeUndefined();
    expect(cookieDomain("not4dare.com")).toBeUndefined();
  });

  it("links the site and the panel to each other", () => {
    expect(adminHome("www.4dare.com")).toBe("https://admin.4dare.com");
    expect(adminHome("localhost:3000")).toBe("/admin");
    expect(siteHome("admin.4dare.com")).toBe("https://www.4dare.com");
    expect(siteHome("localhost:3000")).toBe("/");
  });
});
