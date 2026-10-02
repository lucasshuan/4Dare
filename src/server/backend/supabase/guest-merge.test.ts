import { beforeAll, describe, expect, it } from "vitest";

describe("guest merge cookie", () => {
  let seal: (id: string) => string;
  let open: (value: string | undefined) => string | null;
  beforeAll(async () => {
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    ({ sealGuest: seal, openGuest: open } = await import("./guest-merge"));
  });

  it("gives back the guest id it signed", () => {
    expect(open(seal("2f1c-guest"))).toBe("2f1c-guest");
  });

  it("refuses ids it did not sign", () => {
    const value = seal("2f1c-guest");
    const signature = value.slice(value.lastIndexOf("."));
    expect(open(`someone-else${signature}`)).toBeNull();
    expect(open("2f1c-guest.forged")).toBeNull();
    expect(open("no-signature")).toBeNull();
    expect(open(undefined)).toBeNull();
  });
});
