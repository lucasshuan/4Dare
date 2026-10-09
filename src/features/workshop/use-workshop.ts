"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { GameKey } from "@/game/games";
import type {
  WorkshopItem,
  WorkshopKind,
  WorkshopPage,
} from "@/server/community-contract";
import type { ReviewItem } from "@/server/workshop";

export interface WorkshopFilters {
  game: GameKey | null;
  kind: WorkshopKind | null;
  status: "voting" | "live" | "refused";
  mine: boolean;
  q: string;
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

export function useWorkshop(filters: WorkshopFilters) {
  const lang = useLocale();
  return useInfiniteQuery({
    queryKey: ["workshop", lang, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ lang, status: filters.status });
      if (filters.game) p.set("game", filters.game);
      if (filters.kind) p.set("kind", filters.kind);
      if (filters.mine) p.set("mine", "1");
      if (filters.q.trim()) p.set("q", filters.q.trim());
      if (pageParam) p.set("offset", String(pageParam));
      return json<WorkshopPage>(`/api/workshop?${p}`);
    },
    getNextPageParam: (last) => last.next ?? undefined,
    placeholderData: (prev) => prev,
  });
}

/** One card, for a shared link. */
export function useWorkshopItem(id: string | null) {
  const lang = useLocale();
  return useQuery({
    queryKey: ["workshop-item", id, lang],
    enabled: !!id,
    queryFn: () =>
      json<WorkshopItem>(
        `/api/workshop/${encodeURIComponent(id ?? "")}?lang=${lang}`,
      ),
    retry: false,
  });
}

export function useReviewQueue() {
  const lang = useLocale();
  return useQuery({
    queryKey: ["workshop-review", lang],
    queryFn: () =>
      json<{ queue: ReviewItem[] }>(`/api/workshop/review?lang=${lang}`).then(
        (r) => r.queue,
      ),
    retry: false,
  });
}

export function useRefreshWorkshop() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: ["workshop"] });
    void client.invalidateQueries({ queryKey: ["workshop-item"] });
    void client.invalidateQueries({ queryKey: ["workshop-review"] });
    void client.invalidateQueries({ queryKey: ["menu-counts"] });
  };
}
