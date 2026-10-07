import "server-only";
import type { Avatar } from "@/game/types";
import type { ProfileStore, StoredProfile } from "../types";
import { serviceClient } from "./clients";
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
>;

const COLUMNS =
  "id, handle, name, guest_number, avatar, created_at, quote, accent";

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
  };
}
