import "server-only";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomGuestNumber } from "@/game/guest-names";
import type { Avatar, Identity, Lang } from "@/game/types";
import type { Me } from "@/server/contract";
import {
  ensureGuest,
  GUEST_COOKIE,
  type Guest,
  openGuest,
} from "../../auth/guest";
import { randomAvatar } from "../pastel";
import type { AuthService } from "../types";
import { serviceClient, sessionClient } from "./clients";
import { accountDefaults, isAccount } from "./identity";

interface ProfileRow {
  id: string;
  name: string | null;
  guest_number: number;
  avatar: Avatar;
  provider: Me["provider"];
  provider_avatar_url: string | null;
}

const profiles = () => serviceClient().from("profiles");

/**
 * An account's profile, made the first time it signs in. It starts from the
 * guest it was (same critter and name number), with the provider's name and
 * picture on offer.
 */
export async function syncProfile(
  user: User,
  guest: Guest | null,
): Promise<ProfileRow> {
  const { data, error } = await profiles()
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as ProfileRow;
  const row: ProfileRow = {
    id: user.id,
    guest_number: guest?.guestNumber ?? randomGuestNumber(),
    avatar: guest?.avatar ?? randomAvatar(),
    ...accountDefaults(user),
  };
  const insert = await profiles().upsert(row).select("*").single();
  if (insert.error) throw insert.error;
  return insert.data as ProfileRow;
}

const accountMe = (p: ProfileRow): Me => ({
  id: p.id,
  isGuest: false,
  name: p.name,
  guestNumber: p.guest_number,
  avatar: p.avatar,
  provider: p.provider,
  providerAvatarUrl: p.provider_avatar_url,
  authMode: "supabase",
});

const guestMe = (g: Guest): Me => ({
  id: g.id,
  isGuest: true,
  name: null,
  guestNumber: g.guestNumber,
  avatar: g.avatar,
  provider: null,
  providerAvatarUrl: null,
  authMode: "supabase",
});

/**
 * Accounts are Supabase users signed in with Discord or Google. Guests are
 * only a signed cookie (see auth/guest.ts): no Supabase user, no profile row.
 */
export function supabaseAuth(): AuthService {
  async function account(): Promise<ProfileRow | null> {
    const client = await sessionClient();
    const { data } = await client.auth.getUser();
    const user = data.user;
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
      const fields: Partial<ProfileRow> = {};
      if (patch.name !== undefined) fields.name = patch.name;
      if (patch.avatar !== undefined) fields.avatar = patch.avatar;
      const { data, error } = await profiles()
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", p.id)
        .select("*")
        .single();
      if (error) throw error;
      return accountMe(data as ProfileRow);
    },
    async signOut() {
      const client = await sessionClient();
      await client.auth.signOut();
    },
  };
}
