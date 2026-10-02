import "server-only";
import { cookies } from "next/headers";
import type { Avatar, Identity, Lang } from "@/game/types";
import type { Me } from "@/server/contract";
import { ensureGuest, type Guest } from "../../auth/guest";
import type { AuthService } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

/** Fake accounts made with "enter test account", keyed by the guest's id. */
const ACCOUNTS_FILE = "test-accounts.json";

interface TestAccount {
  name: string | null;
  avatar: Avatar;
  provider: NonNullable<Me["provider"]>;
}

/**
 * Local mode: guests are the signed cookie (see auth/guest.ts), like online.
 * There is no real sign-in; "enter test account" turns the guest into a fake
 * Discord/Google account (same id) so the profile screen can be tried.
 */
export function localAuth(): AuthService & {
  enterTestAccount(provider: "discord" | "google"): Promise<Me>;
} {
  const accounts = processSingleton(
    "test-accounts",
    () =>
      new Map<string, TestAccount>(
        Object.entries(
          readJson<Record<string, TestAccount>>(ACCOUNTS_FILE, {}),
        ),
      ),
  );
  const save = () => writeJson(ACCOUNTS_FILE, Object.fromEntries(accounts));
  const guest = async () => ensureGuest(await cookies());

  const toMe = (g: Guest): Me => {
    const a = accounts.get(g.id);
    return {
      id: g.id,
      isGuest: !a,
      name: a?.name ?? null,
      guestNumber: g.guestNumber,
      avatar: a?.avatar ?? g.avatar,
      provider: a?.provider ?? null,
      providerAvatarUrl: null,
      authMode: "local",
    };
  };

  return {
    async me(_lang: Lang) {
      return toMe(await guest());
    },
    async identity(lang: Lang): Promise<Identity> {
      const me = toMe(await guest());
      return {
        id: me.id,
        isGuest: me.isGuest,
        name: me.name,
        guestNumber: me.guestNumber,
        avatar: me.avatar,
        lang,
      };
    },
    async updateProfile(patch) {
      const g = await guest();
      const a = accounts.get(g.id);
      if (!a) throw new Error("only accounts have a profile");
      if (patch.name !== undefined) a.name = patch.name;
      if (patch.avatar !== undefined) a.avatar = patch.avatar;
      save();
      return toMe(g);
    },
    async signOut() {
      const g = await guest();
      accounts.delete(g.id);
      save();
    },
    async enterTestAccount(provider) {
      const g = await guest();
      accounts.set(g.id, {
        name: accounts.get(g.id)?.name ?? `Tester ${g.guestNumber % 100}`,
        avatar: g.avatar,
        provider,
      });
      save();
      return toMe(g);
    },
  };
}
