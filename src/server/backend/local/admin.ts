import "server-only";
import { type AdminStore, type AuditEntry, emptyStats } from "../admin-types";

/** Local mode: an empty overview, and the audit kept in memory. */
export function localAdmin(): AdminStore {
  const log: (AuditEntry & { at: number })[] = [];
  return {
    async stats(days) {
      return emptyStats(days);
    },
    async audit(e) {
      log.push({ ...e, at: Date.now() });
    },
  };
}
