import "server-only";
import { unstable_cache } from "next/cache";
import { adminOnly } from "@/server/auth/roles";
import type { AdminStats } from "@/server/backend/admin-types";
import { getBackend } from "../backend";

/** Days in the overview's chart. */
export const OVERVIEW_DAYS = 14;

/** admin_stats, shared by the overview and the counters for a minute. */
const stats = unstable_cache(
  () => getBackend().admin.stats(OVERVIEW_DAYS),
  ["admin-stats"],
  { revalidate: 60, tags: ["admin-stats"] },
);

/** The overview's numbers (admin only). */
export async function overview(): Promise<AdminStats> {
  await adminOnly();
  return stats();
}

/** What waits on the admin, for the menu's entry and the panel's rail. */
export interface AdminCounts {
  /** Player pictures waiting for a look. */
  pictures: number;
  /** Workshop suggestions up for votes or being looked at. */
  workshop: number;
  /** Rooms open now, and how many of them are in a match. */
  rooms: number;
  playing: number;
  /** Reports of the last seven days. */
  reports: number;
  /** pictures + workshop: the menu's one number. */
  waiting: number;
}

export async function adminCounts(): Promise<AdminCounts> {
  await adminOnly();
  const s = await stats();
  const workshop = s.workshop.voting + s.workshop.review;
  return {
    pictures: s.library.pending,
    workshop,
    rooms: s.rooms.open,
    playing: s.rooms.playing,
    reports: s.reportsWeek,
    waiting: s.library.pending + workshop,
  };
}
