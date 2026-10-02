import "server-only";
import type { User } from "@supabase/supabase-js";
import { randomGuestNumber } from "@/game/guest-names";
import {
  type Avatar,
  GameError,
  type Identity,
  type Lang,
  MAX_NAME,
} from "@/game/types";
import type { Me } from "@/server/contract";
import { randomPastel } from "../pastel";
import type { AuthService } from "../types";
import { serviceClient, sessionClient } from "./clients";

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

function providerOf(user: User): Me["provider"] {
  const p = user.app_metadata?.provider;
  return p === "discord" || p === "google" ? p : null;
}

/** What the provider tells us about the person, for a fresh account profile. */
export function accountDefaults(user: User) {
  const meta = user.user_metadata ?? {};
  const raw = String(
    meta.full_name ??
      meta.name ??
      meta.user_name ??
      meta.preferred_username ??
      "",
  ).trim();
  return {
    name: raw.slice(0, MAX_NAME) || null,
    provider: providerOf(user),
    provider_avatar_url:
      typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}

async function loadOrCreate(user: User): Promise<ProfileRow> {
  const { data, error } = await profiles()
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as ProfileRow;
  const guest = user.is_anonymous !== false && !providerOf(user);
  const row: ProfileRow = {
    id: user.id,
    is_guest: guest,
    guest_number: randomGuestNumber(),
    avatar: { kind: "color", color: randomPastel() },
    ...(guest
      ? { name: null, provider: null, provider_avatar_url: null }
      : accountDefaults(user)),
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
      return toMe(await loadOrCreate(await currentUser()));
    },
    async identity(lang: Lang): Promise<Identity> {
      const p = await loadOrCreate(await currentUser());
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
