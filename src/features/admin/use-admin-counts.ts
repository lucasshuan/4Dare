"use client";

import { useQuery } from "@tanstack/react-query";
import type { AdminCounts } from "@/server/admin/overview";

/** What waits on the admin (GET /api/admin/counts), refreshed every minute. */
export function useAdminCounts(enabled = true) {
  return useQuery({
    queryKey: ["admin-counts"],
    enabled,
    queryFn: async (): Promise<AdminCounts> => {
      const res = await fetch("/api/admin/counts", { cache: "no-store" });
      if (!res.ok) throw new Error(`admin counts: ${res.status}`);
      return (await res.json()) as AdminCounts;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
