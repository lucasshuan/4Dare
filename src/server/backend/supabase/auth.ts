import "server-only";
import type { User } from "@supabase/supabase-js";
import { randomGuestNumber } from "@/game/guest-names";
import { type Avatar, GameError, type Identity, type Lang } from "@/game/types";
import type { Me } from "@/server/contract";
import { randomAvatar } from "../pastel";
import type { AuthService } from "../types";
import { serviceClient, sessionClient } from "./clients";
import { accountDefaults, isAccount } from "./identity";

interface ProfileRow {
  id: string;
  is_guest: boolean;
  name: string | null;
  guest_number: number;
  avatar: Avatar;
  provider: Me["provider"];
  provider_avatar_url: string | null;
}

const profiles = () => serviceClient().from("profiles");

/**
 * The user's profile, created on first sight. A guest who linked Discord or
 * Google becomes an account here: name and picture from the provider, the
 * guest's critter and seats kept (same user id).
 */
export async function syncProfile(user: User): Promise<ProfileRow> {
  const { data, error } = await profiles()
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  const account = isAccount(user);
  const current = data as ProfileRow | null;
  if (current && (!current.is_guest || !account)) return current;
  const defaults = accountDefaults(user);
  if (current) {
    const upgraded = await profiles()
      .update({
        is_guest: false,
        name: current.name ?? defaults.name,
        provider: defaults.provider,
        provider_avatar_url: defaults.provider_avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("*")
      .single();
    if (upgraded.error) throw upgraded.error;
    return upgraded.data as ProfileRow;
  }
  const row: ProfileRow = {
    id: user.id,
    is_guest: !account,
    guest_number: randomGuestNumber(),
    avatar: randomAvatar(),
    ...(account
      ? defaults
      : { name: null, provider: null, provider_avatar_url: null }),
  };
  const insert = await profiles().upsert(row).select("*").single();
  if (insert.error) throw insert.error;
  return insert.data as ProfileRow;
}

const toMe = (p: ProfileRow): Me => ({
  id: p.id,
  isGuest: p.is_guest,
  name: p.name,
  guestNumber: p.guest_number,
  avatar: p.avatar,
  provider: p.provider,
  providerAvatarUrl: p.provider_avatar_url,
  authMode: "supabase",
});

/** Guests are anonymous Supabase users; accounts are the same user linked to Discord or Google. */
export function supabaseAuth(): AuthService {
  async function currentUser(): Promise<User> {
    const client = await sessionClient();
    const { data } = await client.auth.getUser();
    if (data.user) return data.user;
    const anon = await client.auth.signInAnonymously();
    if (anon.error || !anon.data.user) throw new GameError("unauthorized");
    return anon.data.user;
  }

  return {
    async me(_lang) {
      return toMe(await syncProfile(await currentUser()));
    },
    async identity(lang: Lang): Promise<Identity> {
      const p = await syncProfile(await currentUser());
      return {
        id: p.id,
        isGuest: p.is_guest,
        name: p.name,
        guestNumber: p.guest_number,
        avatar: p.avatar,
        lang,
      };
    },
    async updateProfile(patch) {
      const user = await currentUser();
      const fields: Partial<ProfileRow> = {};
      if (patch.name !== undefined) fields.name = patch.name;
      if (patch.avatar !== undefined) fields.avatar = patch.avatar;
      const { data, error } = await profiles()
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .select("*")
        .single();
      if (error) throw error;
      return toMe(data as ProfileRow);
    },
    async signOut() {
      const client = await sessionClient();
      await client.auth.signOut();
    },
  };
}
