import type { JwtPayload, User, UserAppMetadata } from "@supabase/supabase-js";
import { MAX_NAME } from "@/game/types";
import type { Account } from "@/server/contract";

type Provider = NonNullable<Account["provider"]>;

const isProvider = (value: unknown): value is Provider =>
  value === "discord" || value === "google";

/** The Discord/Google identity of a user, also when a guest linked it later. */
function oauthIdentity(user: User) {
  return user.identities?.find((identity) => isProvider(identity.provider));
}

/** Discord or Google among the providers Auth lists in `app_metadata`. */
function listedProvider(
  meta: UserAppMetadata | undefined,
): Account["provider"] {
  const listed: unknown[] = [meta?.provider, ...(meta?.providers ?? [])];
  return listed.find(isProvider) ?? null;
}

/**
 * Discord or Google, if the user has one. A guest who links an account keeps
 * `app_metadata.provider = "anonymous"`, so identities are checked first.
 */
export function providerOf(user: User): Account["provider"] {
  const fromIdentity = oauthIdentity(user)?.provider;
  if (isProvider(fromIdentity)) return fromIdentity;
  return listedProvider(user.app_metadata);
}

/** A Discord/Google user who is no longer an anonymous guest. */
export const isAccount = (user: User) =>
  user.is_anonymous !== true && providerOf(user) !== null;

/**
 * isAccount for a verified access token (getClaims). A token carries no
 * identities, but a linked provider is listed in `app_metadata.providers` too.
 */
export const isAccountClaims = (claims: JwtPayload) =>
  claims.is_anonymous !== true && listedProvider(claims.app_metadata) !== null;

/** What the provider tells us about the person: display name and picture. */
export function accountDefaults(user: User) {
  const meta: Record<string, unknown> = {
    ...(user.user_metadata ?? {}),
    ...(oauthIdentity(user)?.identity_data ?? {}),
  };
  const claims = (meta.custom_claims ?? {}) as Record<string, unknown>;
  // Discord: global_name is the display name, full_name the @username.
  const raw = [
    claims.global_name,
    meta.full_name,
    meta.name,
    meta.user_name,
    meta.preferred_username,
  ].find((value) => typeof value === "string" && value.trim());
  const name = String(raw ?? "")
    .replace(/#\d+$/, "")
    .trim()
    .slice(0, MAX_NAME);
  const picture = [meta.avatar_url, meta.picture].find(
    (value) => typeof value === "string" && value.startsWith("https://"),
  );
  return {
    name: name || null,
    provider: providerOf(user),
    provider_avatar_url: (picture as string | undefined) ?? null,
  };
}
