import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { randomGuestNumber } from "@/game/guest-names";
import type { Avatar, Identity, Lang } from "@/game/types";
import type { Me } from "@/server/contract";
import { randomPastel } from "../pastel";
import type { AuthService } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

export const UID_COOKIE = "dare_uid";
const PROFILES_FILE = "profiles.json";
const UUID = /^[0-9a-f-]{36}$/;

interface Profile {
  id: string;
  isGuest: boolean;
  name: string | null;
  guestNumber: number;
  avatar: Avatar;
  provider: Me["provider"];
}

function newGuest(id: string): Profile {
  return {
    id,
    isGuest: true,
    name: null,
    guestNumber: randomGuestNumber(),
    avatar: { kind: "color", color: randomPastel() },
    provider: null,
  };
}

/** Guests are identified by a cookie; there is no real sign-in in local mode. */
export function localAuth(): AuthService & {
  enterTestAccount(provider: "discord" | "google"): Promise<Me>;
} {
  const profiles = processSingleton(
    "profiles",
    () =>
      new Map<string, Profile>(
        Object.entries(readJson<Record<string, Profile>>(PROFILES_FILE, {})),
      ),
  );
  const save = () => writeJson(PROFILES_FILE, Object.fromEntries(profiles));

  async function current(): Promise<Profile> {
    const jar = await cookies();
    let id = jar.get(UID_COOKIE)?.value;
    if (!id || !UUID.test(id)) {
      id = randomUUID();
      jar.set(UID_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    let p = profiles.get(id);
    if (!p) {
      p = newGuest(id);
      profiles.set(id, p);
      save();
    }
    return p;
  }

  const toMe = (p: Profile): Me => ({
    id: p.id,
    isGuest: p.isGuest,
    name: p.name,
    guestNumber: p.guestNumber,
    avatar: p.avatar,
    provider: p.provider,
    providerAvatarUrl: null,
    authMode: "local",
  });

  return {
    async me(_lang: Lang) {
      return toMe(await current());
    },
    async identity(lang: Lang): Promise<Identity> {
      const p = await current();
      return {
        id: p.id,
        isGuest: p.isGuest,
        name: p.name,
        guestNumber: p.guestNumber,
        avatar: p.avatar,
        lang,
      };
    },
    async updateProfile(patch) {
      const p = await current();
      if (patch.name !== undefined) p.name = patch.name;
      if (patch.avatar !== undefined) p.avatar = patch.avatar;
      save();
      return toMe(p);
    },
    async signOut() {
      const jar = await cookies();
      jar.delete(UID_COOKIE);
    },
    async enterTestAccount(provider) {
      const p = await current();
      p.isGuest = false;
      p.name = p.name ?? `Tester ${p.guestNumber}`;
      p.provider = provider;
      save();
      return toMe(p);
    },
  };
}
