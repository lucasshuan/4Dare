"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useCallback } from "react";
import type { Me } from "@/server/contract";

export const meKey = ["me"] as const;

/** The signed-in person (a guest on first visit). */
export function useMe() {
  const lang = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<Me> => {
      const res = await fetch(`/api/me?lang=${lang}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`me: ${res.status}`);
      return (await res.json()) as Me;
    },
    staleTime: 60_000,
  });
  const setMe = useCallback(
    (me: Me) => client.setQueryData(meKey, me),
    [client],
  );
  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: meKey }),
    [client],
  );
  return { me: query.data ?? null, isLoading: query.isPending, setMe, refresh };
}
