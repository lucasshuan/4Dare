import "server-only";
import type { NewReport, ReportStore } from "../types";
import { processSingleton } from "./disk";

/** Local mode: in memory; nothing reads reports yet. */
export function localReports(): ReportStore {
  const kept = processSingleton("player-reports", () => [] as NewReport[]);
  return {
    async add(report) {
      const again = kept.some(
        (r) =>
          r.reporterId === report.reporterId &&
          r.target.id === report.target.id &&
          r.room === report.room,
      );
      if (again) return false;
      kept.push(structuredClone(report));
      return true;
    },
    async reassign(from, to) {
      for (const r of kept) {
        if (r.reporterId === from) r.reporterId = to;
        if (r.target.id === from) r.target = { ...r.target, id: to };
      }
    },
  };
}
