import "server-only";
import type { ReportStore } from "../types";
import { json, serviceClient } from "./clients";

const UNIQUE_VIOLATION = "23505";

/** Supabase: player_reports (0050_watchers_and_reports.sql), server only. */
export function supabaseReports(): ReportStore {
  return {
    async add(r) {
      const { error } = await serviceClient()
        .from("player_reports")
        .insert({
          reporter_id: r.reporterId,
          target_id: r.target.id,
          target: json(r.target),
          room_code: r.room,
          reason: r.reason,
          note: r.note,
          lines: json(r.lines),
        });
      if (error?.code === UNIQUE_VIOLATION) return false;
      if (error) throw error;
      return true;
    },
    async reassign(from, to) {
      const { error } = await serviceClient().rpc("reassign_player_reports", {
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
    },
  };
}
