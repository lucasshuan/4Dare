import "server-only";
import {
  parseAbout,
  parseBanner,
  parsePrivacy,
  parseShowcase,
} from "@/game/profile/profile";
import { type Avatar, GameError } from "@/game/types";
import type { ProfileStore, StoredProfile } from "../types";
import { json, serviceClient } from "./clients";
import type { Database } from "./database.types";

type Row = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "handle"
  | "name"
  | "guest_number"
  | "avatar"
  | "created_at"
  | "quote"
  | "accent"
  | "banner"
  | "showcase"
  | "about"
  | "privacy"
  | "handle_changed_at"
>;

const COLUMNS =
  "id, handle, name, guest_number, avatar, created_at, quote, accent, banner, showcase, about, privacy, handle_changed_at";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// a profile made before handles has none until its next visit: no page yet
const toProfile = (r: Row): StoredProfile[] =>
  r.handle
    ? [
        {
          id: r.id,
          handle: r.handle,
          name: r.name,
          guestNumber: r.guest_number,
          avatar: r.avatar as unknown as Avatar,
          createdAt: Date.parse(r.created_at),
          quote: r.quote,
          accent: r.accent,
          banner: parseBanner(r.banner),
          showcase: parseShowcase(r.showcase),
          about: parseAbout(r.about),
          privacy: parsePrivacy(r.privacy),
          handleChangedAt: r.handle_changed_at
            ? Date.parse(r.handle_changed_at)
            : null,
        },
      ]
    : [];

/** Table profiles: the accounts' public side. */
export function supabaseProfiles(): ProfileStore {
  const profiles = () => serviceClient().from("profiles");
  return {
    async byHandle(handle) {
      const { data, error } = await profiles()
        .select(COLUMNS)
        .eq("handle", handle)
        .maybeSingle();
      if (error) throw error;
      return data ? (toProfile(data)[0] ?? null) : null;
    },
    async byIds(ids) {
      const uuids = [...new Set(ids)].filter((id) => UUID.test(id));
      if (uuids.length === 0) return [];
      const { data, error } = await profiles().select(COLUMNS).in("id", uuids);
      if (error) throw error;
      return (data ?? []).flatMap(toProfile);
    },
    async update(id, patch) {
      const { data, error } = await profiles()
        .update({
          ...(patch.handle !== undefined && { handle: patch.handle }),
          ...(patch.handleChangedAt !== undefined && {
            handle_changed_at:
              patch.handleChangedAt === null
                ? null
                : new Date(patch.handleChangedAt).toISOString(),
          }),
          ...(patch.quote !== undefined && { quote: patch.quote }),
          ...(patch.accent !== undefined && { accent: patch.accent }),
          ...(patch.banner !== undefined && { banner: json(patch.banner) }),
          ...(patch.showcase !== undefined && {
            showcase: json(patch.showcase),
          }),
          ...(patch.about !== undefined && { about: json(patch.about) }),
          ...(patch.privacy !== undefined && { privacy: json(patch.privacy) }),
          ...(patch.settings !== undefined && {
            settings: json(patch.settings),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(COLUMNS)
        .single();
      // 23505: unique_violation, the handle is someone else's
      if (error?.code === "23505") throw new GameError("handle_taken");
      if (error) throw error;
      const [profile] = toProfile(data);
      if (!profile) throw new Error("profiles: updated row has no handle");
      return profile;
    },
  };
}
