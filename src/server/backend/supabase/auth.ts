import "server-only";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { guestAvatar, randomGuestNumber } from "@/game/guest-names";
import { parseSynced } from "@/game/options";
import { handleCandidates } from "@/game/profile/handle";
import { type Avatar, GameError, type Identity, type Lang } from "@/game/types";
import type { Account } from "@/server/contract";
import {
  ensureGuest,
  GUEST_COOKIE,
  type Guest,
  openGuest,
} from "../../auth/guest";
import type { AuthService } from "../types";
import { serviceClient, sessionClient } from "./clients";
import { accountDefaults, isAccount, isAccountClaims } from "./identity";

interface ProfileRow {
  id: string;
  settings?: unknown;
  /** Null only for a profile made before handles, until its next visit. */
  handle: string | null;
  name: string | null;
  guest_number: number;
  avatar: Avatar;
  provider: Account["provider"];
  provider_avatar_url: string | null;
}

const profiles = () => serviceClient().from("profiles");

async function profileOf(id: string): Promise<ProfileRow | null> {
  const { data, error } = await profiles()
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

/**
 * An account's profile, made the first time it signs in. It starts from the
 * guest it was (same creature and name number), with the provider's name and
 * picture on offer.
 */
export async function syncProfile(
  user: User,
  guest: Guest | null,
): Promise<ProfileRow> {
  const found = await profileOf(user.id);
  if (found) return withHandle(found);
  const defaults = accountDefaults(user);
  const guestNumber = guest?.guestNumber ?? randomGuestNumber();
  return firstFreeHandle(defaults.name, user.id, (handle) =>
    profiles()
      .upsert({
        id: user.id,
        handle,
        guest_number: guestNumber,
        avatar: guest?.avatar ?? guestAvatar(guestNumber),
        ...defaults,
      })
      .select("*")
      .single(),
  );
}

/** A profile made before handles gets one from its name. */
async function withHandle(p: ProfileRow): Promise<ProfileRow> {
  if (p.handle) return p;
  return firstFreeHandle(p.name, p.id, (handle) =>
    profiles().update({ handle }).eq("id", p.id).select("*").single(),
  );
}

/** Writes the first of the name's handles nobody has (the unique index decides). */
async function firstFreeHandle(
  name: string | null,
  id: string,
  write: (
    handle: string,
  ) => PromiseLike<{ data: unknown; error: { code?: string } | null }>,
): Promise<ProfileRow> {
  let last: unknown = null;
  for (const handle of handleCandidates(name, id)) {
    const { data, error } = await write(handle);
    if (!error) return data as ProfileRow;
    // 23505: unique_violation, that handle is someone else's
    if (error.code !== "23505") throw error;
    last = error;
  }
  throw last;
}

const accountMe = (p: ProfileRow): Account => ({
  id: p.id,
  isGuest: false,
  handle: p.handle,
  name: p.name,
  guestNumber: p.guest_number,
  avatar: p.avatar,
  provider: p.provider,
  providerAvatarUrl: p.provider_avatar_url,
  authMode: "supabase",
  // never saved yet: the browser sends this device's own
  settings:
    p.settings &&
    typeof p.settings === "object" &&
    Object.keys(p.settings).length > 0
      ? parseSynced(p.settings)
      : null,
});

const guestMe = (g: Guest): Account => ({
  id: g.id,
  isGuest: true,
  handle: null,
  name: null,
  guestNumber: g.guestNumber,
  avatar: g.avatar,
  provider: null,
  providerAvatarUrl: null,
  authMode: "supabase",
  settings: null,
});

/**
 * Accounts are Supabase users signed in with Discord or Google. Guests are
 * only a signed cookie (see auth/guest.ts): no Supabase user, no profile row.
 */
export function supabaseAuth(): AuthService {
  async function account(): Promise<ProfileRow | null> {
    const client = await sessionClient();
    // Checked here against the project's public signing key (cached), so no
    // call to Supabase Auth; an expiring token is refreshed like getUser does.
    // A garbled or forged cookie can make it throw: that visitor is a guest.
    const { data } = await client.auth
      .getClaims()
      .catch(() => ({ data: null }));
    if (!data || !isAccountClaims(data.claims)) return null;
    const profile = await profileOf(data.claims.sub);
    if (profile) return withHandle(profile);
    // No profile yet (the callback could not make one): the provider's name
    // and picture are only on the full user.
    const { data: fresh } = await client.auth.getUser();
    const user = fresh.user;
    if (!user || !isAccount(user)) return null;
    const jar = await cookies();
    return syncProfile(user, openGuest(jar.get(GUEST_COOKIE)?.value));
  }
  const guest = async () => ensureGuest(await cookies());

  return {
    async me(_lang) {
      const p = await account();
      return p ? accountMe(p) : guestMe(await guest());
    },
    async identity(lang: Lang): Promise<Identity> {
      const me = await account();
      if (me) {
        return {
          id: me.id,
          isGuest: false,
          name: me.name,
          guestNumber: me.guest_number,
          avatar: me.avatar,
          lang,
        };
      }
      const g = await guest();
      return {
        id: g.id,
        isGuest: true,
        name: null,
        guestNumber: g.guestNumber,
        avatar: g.avatar,
        lang,
      };
    },
    async updateProfile(patch) {
      const p = await account();
      if (!p) throw new Error("only accounts have a profile");
      const fields: Partial<Pick<ProfileRow, "name" | "avatar">> = {};
      if (patch.name !== undefined) fields.name = patch.name;
      if (patch.avatar !== undefined) fields.avatar = patch.avatar;
      const { data, error } = await profiles()
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", p.id)
        .select("*")
        .single();
      if (error) throw error;
      return accountMe(data as unknown as ProfileRow);
    },
    async signOut(everywhere = false) {
      const client = await sessionClient();
      await client.auth.signOut({ scope: everywhere ? "global" : "local" });
    },
    async accountInfo() {
      if (!(await account())) return null;
      const { data } = await (await sessionClient()).auth.getUser();
      const user = data.user;
      if (!user) return null;
      const providers = (["discord", "google"] as const).filter((p) =>
        user.identities?.some((i) => i.provider === p),
      );
      return { email: user.email ?? null, providers, canLink: true };
    },
    async unlink(provider) {
      const client = await sessionClient();
      const { data, error } = await client.auth.getUserIdentities();
      if (error) throw error;
      const oauth = (data?.identities ?? []).filter(
        (i) => i.provider === "discord" || i.provider === "google",
      );
      const gone = oauth.find((i) => i.provider === provider);
      // the last way in stays
      if (!gone || oauth.length < 2) throw new GameError("invalid_input");
      const unlinked = await client.auth.unlinkIdentity(gone);
      if (unlinked.error) throw unlinked.error;
      const left = oauth.find((i) => i !== gone)
        ?.provider as Account["provider"];
      const p = await account();
      if (p && p.provider === provider)
        await profiles().update({ provider: left }).eq("id", p.id);
    },
    async deleteAccount() {
      const p = await account();
      if (!p) throw new GameError("unauthorized");
      const service = serviceClient();
      // the profile, its mural and its reports go with the user (foreign keys)
      const { error } = await service.auth.admin.deleteUser(p.id);
      if (error) throw error;
      const badges = await service
        .from("user_badges")
        .delete()
        .eq("user_id", p.id);
      if (badges.error) throw badges.error;
      await (await sessionClient()).auth.signOut({ scope: "local" });
    },
  };
}
