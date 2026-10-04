import "server-only";
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
    async reassign(fromUserId, toUserId) {
      const { error } = await serviceClient().rpc("reassign_matches", {
        from_id: fromUserId,
        to_id: toUserId,
      });
      if (error) throw error;
    },
    async popularPicks(themeId, limit) {
      const { data, error } = await serviceClient().rpc("theme_pick_scores", {
        p_theme: themeId,
        p_limit: limit,
      });
      if (error) throw error;
      return (
        (data ?? []) as {
          id: string;
          picks: number;
          likes: number;
          dislikes: number;
        }[]
      ).map((r) => ({
        id: r.id,
        picks: Number(r.picks),
        likes: Number(r.likes),
        dislikes: Number(r.dislikes),
      }));
    },
    async rateDraw(f) {
      const { error } = await serviceClient().from("pick_feedback").upsert({
        theme_id: f.themeId,
        character_id: f.characterId,
        user_id: f.userId,
        liked: f.liked,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}
