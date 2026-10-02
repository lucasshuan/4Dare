import "server-only";
import type { MatchStore } from "../types";
import { serviceClient } from "./clients";

/** Supabase: one call per finished match (see record_match in the migrations). */
export function supabaseMatches(): MatchStore {
  return {
    async record(match) {
      const { error } = await serviceClient().rpc("record_match", { m: match });
      if (error) throw error;
    },
    async reassign(fromUserId, toUserId) {
      const { error } = await serviceClient().rpc("reassign_matches", {
        from_id: fromUserId,
        to_id: toUserId,
      });
      if (error) throw error;
    },
  };
}
