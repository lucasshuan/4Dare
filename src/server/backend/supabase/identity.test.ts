import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { accountDefaults, isAccount, providerOf } from "./identity";

// Shapes as Supabase Auth returns them (trimmed to what we read).
const user = (fields: Partial<User>): User =>
  ({
    id: "u1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
    ...fields,
  }) as User;

const guest = user({
  is_anonymous: true,
  app_metadata: { provider: "anonymous", providers: ["anonymous"] },
});

/** A guest who linked Discord: app_metadata.provider stays "anonymous". */
const linkedDiscord = user({
  is_anonymous: false,
  app_metadata: { provider: "anonymous", providers: ["anonymous", "discord"] },
  identities: [
    {
      id: "d1",
      identity_id: "i1",
      user_id: "u1",
      provider: "discord",
      identity_data: {
        full_name: "jeanzinho",
        name: "jeanzinho#0",
        custom_claims: { global_name: "Jean Rocha" },
        avatar_url: "https://cdn.discordapp.com/avatars/1/abc.png",
      },
    },
  ],
});

const google = user({
  is_anonymous: false,
  app_metadata: { provider: "google", providers: ["google"] },
  user_metadata: {
    full_name: "Beatriz Albuquerque de Souza",
    picture: "https://lh3.googleusercontent.com/a/xyz",
  },
});

describe("Supabase identity", () => {
  it("tells guests from accounts, also after a guest links Discord", () => {
    expect(providerOf(guest)).toBeNull();
    expect(isAccount(guest)).toBe(false);
    expect(providerOf(linkedDiscord)).toBe("discord");
    expect(isAccount(linkedDiscord)).toBe(true);
    expect(providerOf(google)).toBe("google");
  });

  it("uses Discord's display name, not the @username", () => {
    expect(accountDefaults(linkedDiscord)).toEqual({
      name: "Jean Rocha",
      provider: "discord",
      provider_avatar_url: "https://cdn.discordapp.com/avatars/1/abc.png",
    });
  });

  it("fits long Google names and reads the picture field", () => {
    const d = accountDefaults(google);
    expect(d.name).toBe("Beatriz Albuquer");
    expect(d.provider_avatar_url).toBe(
      "https://lh3.googleusercontent.com/a/xyz",
    );
  });

  it("drops a legacy #0 discriminator and non-https pictures", () => {
    const d = accountDefaults(
      user({
        app_metadata: { provider: "discord" },
        user_metadata: { name: "bia#0", avatar_url: "http://insecure/x.png" },
      }),
    );
    expect(d).toMatchObject({ name: "bia", provider_avatar_url: null });
  });
});
