import "server-only";
import type { BadgeStore } from "../types";
import { serviceClient } from "./clients";

/** Table user_badges (0030): the rules live in the app, only the days here. */
export function supabaseBadges(): BadgeStore {
  const badges = () => serviceClient().from("user_badges");
  return {
    async earned(userId) {
      const { data, error } = await badges()
        .select("badge, earned_at")
        .eq("user_id", userId);
      if (error) throw error;
      return new Map(
        (data ?? []).map((r) => [r.badge, Date.parse(r.earned_at)]),
      );
    },
    async grant(userId, tiers) {
      if (tiers.length === 0) return;
      const { error } = await badges().upsert(
        tiers.map((t) => ({ user_id: userId, badge: t.key, game: t.game })),
        { onConflict: "user_id,badge", ignoreDuplicates: true },
      );
      if (error) throw error;
    },
  };
}
