import "server-only";
import { cookies } from "next/headers";
import { handleCandidates } from "@/game/profile/handle";
import type { Avatar, Identity, Lang } from "@/game/types";
import type { Account } from "@/server/contract";
import { ensureGuest, type Guest } from "../../auth/guest";
import type { AuthService } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

/** Fake accounts made with "enter test account", keyed by the guest's id. */
const ACCOUNTS_FILE = "test-accounts.json";

interface TestAccount {
  /** Missing on accounts made before handles: given on their next visit. */
  handle?: string;
  name: string | null;
  avatar: Avatar;
  provider: NonNullable<Account["provider"]>;
}

/**
 * Local mode: guests are the signed cookie (see auth/guest.ts), like online.
 * There is no real sign-in; "enter test account" turns the guest into a fake
 * Discord/Google account (same id) so the profile screen can be tried.
 */
export function localAuth(): AuthService & {
  enterTestAccount(provider: "discord" | "google"): Promise<Account>;
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

  /** The first of the name's handles no other test account has. */
  const freeHandle = (id: string, name: string | null) => {
    const taken = new Set(
      [...accounts].filter(([k]) => k !== id).map(([, a]) => a.handle),
    );
    return (
      handleCandidates(name, id).find((h) => !taken.has(h)) ??
      `player_${id.replace(/-/g, "").slice(0, 12)}`
    );
  };

  const toMe = (g: Guest): Account => {
    const a = accounts.get(g.id);
    if (a && !a.handle) {
      a.handle = freeHandle(g.id, a.name);
      save();
    }
    return {
      id: g.id,
      isGuest: !a,
      handle: a?.handle ?? null,
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
      const name = accounts.get(g.id)?.name ?? `Tester ${g.guestNumber % 100}`;
      accounts.set(g.id, {
        handle: accounts.get(g.id)?.handle ?? freeHandle(g.id, name),
        name,
        avatar: g.avatar,
        provider,
      });
      save();
      return toMe(g);
    },
  };
}
