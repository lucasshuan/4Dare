// The Supabase auth service with a fake session client and profiles table: who
// is an account comes from the verified token, Auth is only asked when the
// profile is missing.
import {
  AuthInvalidJwtError,
  type JwtPayload,
  type User,
} from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST_COOKIE, newGuest, sealGuest } from "../../auth/guest";
import { supabaseAuth } from "./auth";

type Row = Record<string, unknown> & { id: string };

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
}));
const rows = new Map<string, Row>();
const jar = new Map<string, string>();

/** Only the calls auth.ts makes on `profiles`. */
const profilesTable = () => ({
  select: () => ({
    eq: (_column: string, id: string) => ({
      maybeSingle: async () => ({ data: rows.get(id) ?? null, error: null }),
    }),
  }),
  upsert: (row: Row) => ({
    select: () => ({
      single: async () => {
        rows.set(row.id, row);
        return { data: row, error: null };
      },
    }),
  }),
  update: (fields: Partial<Row>) => ({
    eq: (_column: string, id: string) => ({
      select: () => ({
        single: async () => {
          const row = { ...(rows.get(id) as Row), ...fields };
          rows.set(id, row);
          return { data: row, error: null };
        },
      }),
    }),
  }),
});

vi.mock("./clients", () => ({
  sessionClient: async () => ({ auth }),
  serviceClient: () => ({ from: () => profilesTable() }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) =>
      jar.has(k) ? { name: k, value: jar.get(k) } : undefined,
    set: (k: string, v: string) => void jar.set(k, v),
  }),
}));

const ACCOUNT = "11111111-1111-4111-8111-111111111111";

const claims = (fields: Partial<JwtPayload> = {}): JwtPayload => ({
  iss: "https://project.supabase.co/auth/v1",
  sub: ACCOUNT,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  role: "authenticated",
  aal: "aal1",
  session_id: "s1",
  is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] },
  ...fields,
});
const signedIn = (payload: JwtPayload) =>
  auth.getClaims.mockResolvedValue({
    data: { claims: payload, header: {}, signature: new Uint8Array() },
    error: null,
  });

const googleUser = {
  id: ACCOUNT,
  aud: "authenticated",
  created_at: "",
  is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: { full_name: "Bia Souza", picture: "https://lh3/x" },
} as User;

const profile = (): Row => ({
  id: ACCOUNT,
  name: "Bia",
  guest_number: 7,
  avatar: { kind: "critter", seed: "x", color: "#ffd6e0" },
  provider: "google",
  provider_avatar_url: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  rows.clear();
  jar.clear();
  auth.getClaims.mockResolvedValue({ data: null, error: null });
  auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
});

describe("Supabase auth", () => {
  it("knows an account from its token and profile, without asking Auth", async () => {
    signedIn(claims());
    rows.set(ACCOUNT, profile());
    const me = await supabaseAuth().me("en");
    expect(me).toMatchObject({ id: ACCOUNT, isGuest: false, name: "Bia" });
    const id = await supabaseAuth().identity("pt");
    expect(id).toMatchObject({ id: ACCOUNT, isGuest: false, lang: "pt" });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("keeps guests on their cookie when there is no session or a bad token", async () => {
    const guest = newGuest();
    jar.set(GUEST_COOKIE, sealGuest(guest));
    expect(await supabaseAuth().me("en")).toMatchObject({
      id: guest.id,
      isGuest: true,
    });
    auth.getClaims.mockResolvedValue({
      data: null,
      error: new AuthInvalidJwtError("Invalid JWT signature"),
    });
    expect(await supabaseAuth().me("en")).toMatchObject({ id: guest.id });
    // a garbled token can throw instead of returning an error
    auth.getClaims.mockRejectedValue(new SyntaxError("Unexpected token"));
    expect(await supabaseAuth().me("en")).toMatchObject({ id: guest.id });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("treats anonymous and non Discord/Google tokens as guests", async () => {
    rows.set(ACCOUNT, profile());
    signedIn(
      claims({
        is_anonymous: true,
        app_metadata: { provider: "anonymous", providers: ["anonymous"] },
      }),
    );
    expect((await supabaseAuth().me("en")).isGuest).toBe(true);
    signedIn(claims({ app_metadata: { provider: "email" } }));
    expect((await supabaseAuth().me("en")).isGuest).toBe(true);
  });

  it("makes a missing profile once, from the full user and the guest it was", async () => {
    const guest = newGuest();
    jar.set(GUEST_COOKIE, sealGuest(guest));
    signedIn(claims());
    auth.getUser.mockResolvedValue({ data: { user: googleUser }, error: null });
    const me = await supabaseAuth().me("en");
    expect(me).toMatchObject({
      id: ACCOUNT,
      isGuest: false,
      name: "Bia Souza",
      guestNumber: guest.guestNumber,
      avatar: guest.avatar,
      provider: "google",
      providerAvatarUrl: "https://lh3/x",
    });
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    await supabaseAuth().me("en");
    expect(auth.getUser).toHaveBeenCalledTimes(1);
  });

  it("is a guest when the profile is missing and Auth no longer knows the user", async () => {
    signedIn(claims());
    expect((await supabaseAuth().me("en")).isGuest).toBe(true);
    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(rows.size).toBe(0);
  });

  it("updates the profile of the account in the token", async () => {
    signedIn(claims());
    rows.set(ACCOUNT, profile());
    const me = await supabaseAuth().updateProfile({ name: "Beatriz" });
    expect(me).toMatchObject({ id: ACCOUNT, name: "Beatriz" });
    expect(rows.get(ACCOUNT)?.name).toBe("Beatriz");
    auth.getClaims.mockResolvedValue({ data: null, error: null });
    await expect(supabaseAuth().updateProfile({ name: "x" })).rejects.toThrow(
      "only accounts have a profile",
    );
  });
});
