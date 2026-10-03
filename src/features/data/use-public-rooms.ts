"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { BACKEND } from "@/config";
import type { PublicRoom } from "@/game/types";
import { subscribeLobby } from "@/lib/realtime";

const key = ["public-rooms"] as const;

/**
 * Rooms waiting for players, for the home screen. With Supabase a ping says
 * when the list changed and the poll is only a safety net; local mode has no
 * pings and polls instead.
 */
export function usePublicRooms() {
  const client = useQueryClient();
  // The list version the last ping announced: the CDN serves each version once fetched.
  const version = useRef<number | null>(null);
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<PublicRoom[]> => {
      const v = version.current;
      const res = await fetch(v ? `/api/rooms?v=${v}` : "/api/rooms", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`rooms: ${res.status}`);
      return ((await res.json()) as { rooms: PublicRoom[] }).rooms;
    },
    refetchInterval: BACKEND === "local" ? 3000 : 30_000,
  });
  useEffect(() => {
    // A burst of changes (a room filling up) becomes one fetch.
    let timer: number | undefined;
    const unsubscribe = subscribeLobby(({ at }) => {
      if (at) version.current = Math.max(version.current ?? 0, at);
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => void client.invalidateQueries({ queryKey: key }),
        250,
      );
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [client]);
  return { rooms: query.data ?? [], isLoading: query.isPending };
}
