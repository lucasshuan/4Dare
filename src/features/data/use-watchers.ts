"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { BACKEND } from "@/config";
import type { WatchersView } from "@/game/types";
import { subscribeWatchers } from "@/lib/realtime";

export const watchersKey = (code: string) => ["watchers", code] as const;

/** Past this many, someone watching stops reading the list on every ping: a crowd would flood the server. */
const CROWD = 50;

/**
 * Who watches the room. Players read it again on every ping (spread over a
 * moment, so a burst of newcomers makes one read); someone watching a crowd
 * only every half minute.
 */
export function useWatchers(code: string, watching: boolean) {
  const lang = useLocale();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: watchersKey(code),
    queryFn: async (): Promise<WatchersView> => {
      const res = await fetch(
        `/api/rooms/${encodeURIComponent(code)}/watchers?lang=${lang}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`watchers: ${res.status}`);
      return (await res.json()) as WatchersView;
    },
    refetchInterval: BACKEND === "local" ? 1500 : watching ? 30_000 : 45_000,
    refetchOnWindowFocus: true,
  });
  const total = query.data?.total ?? 0;
  const crowd = useRef(false);
  crowd.current = watching && total > CROWD;
  useEffect(() => {
    let timer: number | undefined;
    const unsubscribe = subscribeWatchers(code, () => {
      if (crowd.current || timer !== undefined) return;
      timer = window.setTimeout(
        () => {
          timer = undefined;
          void client.invalidateQueries({ queryKey: watchersKey(code) });
        },
        150 + Math.random() * 600,
      );
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [client, code]);
  return query.data ?? null;
}
