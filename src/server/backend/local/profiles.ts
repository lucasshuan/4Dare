import "server-only";
import type { SyncedSettings } from "@/game/options";
import {
  type About,
  type Banner,
  type Privacy,
  parseAbout,
  parseAccent,
  parseBanner,
  parsePrivacy,
  parseShowcase,
  type ShowcaseItem,
} from "@/game/profile/profile";
import { GameError } from "@/game/types";
import type { ProfileStore, StoredProfile } from "../types";
import { saveTestAccounts, type TestAccount, testAccounts } from "./auth";

/** What a test account keeps of its profile, beside its name and avatar. */
export interface TestProfile {
  quote?: string | null;
  accent?: string | null;
  banner?: Banner | null;
  showcase?: ShowcaseItem[];
  about?: About;
  privacy?: Privacy;
  handleChangedAt?: number | null;
  settings?: SyncedSettings;
}

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
          quote: a.quote ?? null,
          accent: parseAccent(a.accent),
          banner: parseBanner(a.banner),
          showcase: parseShowcase(a.showcase),
          about: parseAbout(a.about),
          privacy: parsePrivacy(a.privacy),
          handleChangedAt: a.handleChangedAt ?? null,
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
    async update(id, patch) {
      const a = accounts.get(id);
      if (!a) throw new GameError("unauthorized");
      if (
        patch.handle !== undefined &&
        [...accounts].some(([k, o]) => k !== id && o.handle === patch.handle)
      )
        throw new GameError("handle_taken");
      Object.assign(a, patch);
      saveTestAccounts();
      const [profile] = toProfile(id, a);
      if (!profile) throw new Error("test account without a handle");
      return profile;
    },
  };
}
