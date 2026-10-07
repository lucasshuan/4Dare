import "server-only";
import type { ProfileStore, StoredProfile } from "../types";
import { type TestAccount, testAccounts } from "./auth";

const toProfile = (id: string, a: TestAccount): StoredProfile[] =>
  a.handle
    ? [
        {
          id,
          handle: a.handle,
          name: a.name,
          guestNumber: a.guestNumber ?? 0,
          avatar: a.avatar,
          createdAt: a.createdAt ?? 0,
          quote: null,
          accent: null,
        },
      ]
    : [];

/** Local mode: the test accounts are the only profiles. */
export function localProfiles(): ProfileStore {
  const accounts = testAccounts();
  return {
    async byHandle(handle) {
      for (const [id, a] of accounts)
        if (a.handle === handle) return toProfile(id, a)[0] ?? null;
      return null;
    },
    async byIds(ids) {
      return ids.flatMap((id) => {
        const a = accounts.get(id);
        return a ? toProfile(id, a) : [];
      });
    },
  };
}
