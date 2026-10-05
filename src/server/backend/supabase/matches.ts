import "server-only";
import type { Lang } from "@/game/types";
import type { MatchStore } from "../types";
import { json, serviceClient } from "./clients";

/** Supabase: one call per finished match (see record_match in the migrations). */
export function supabaseMatches(): MatchStore {
  return {
    async record(match) {
      const { error } = await serviceClient().rpc("record_match", {
        m: json(match),
      });
      if (error) throw error;
    },
    async played(userIds) {
      // One row is enough: a player can have hundreds (indexed by user_id).
      const found = await Promise.all(
        userIds.map(async (id) => {
          const { data, error } = await serviceClient()
            .from("match_players")
            .select("user_id")
            .eq("user_id", id)
            .limit(1);
          if (error) throw error;
          return data.length > 0 ? id : null;
        }),
      );
      return new Set(found.filter((id) => id !== null));
    },
    async reassign(fromUserId, toUserId) {
      const { error } = await serviceClient().rpc("reassign_matches", {
        from_id: fromUserId,
        to_id: toUserId,
      });
      if (error) throw error;
    },
    async themeStats(themeId, limit) {
      const { data, error } = await serviceClient().rpc("whoami_theme_stats", {
        p_theme: themeId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.character_id,
        lang: r.lang as Lang,
        picks: r.picks,
        suggested: r.suggested,
        fits: r.fits,
        misfits: r.misfits,
      }));
    },
    async voteFit(v) {
      const { error } = await serviceClient().from("whoami_fit_votes").upsert({
        theme_id: v.themeId,
        character_id: v.characterId,
        voter_id: v.voterId,
        lang: v.lang,
        fits: v.fits,
        voted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}
