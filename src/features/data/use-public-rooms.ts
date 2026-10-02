"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { BACKEND } from "@/config";
import type { PublicRoom } from "@/game/types";
import { subscribeLobby } from "@/lib/realtime";

const key = ["public-rooms"] as const;

/** Rooms waiting for players, for the home screen. */
export function usePublicRooms() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<PublicRoom[]> => {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      if (!res.ok) throw new Error(`rooms: ${res.status}`);
      return ((await res.json()) as { rooms: PublicRoom[] }).rooms;
    },
    refetchInterval: BACKEND === "local" ? 3000 : 15_000,
  });
  useEffect(
    () =>
      subscribeLobby(() => void client.invalidateQueries({ queryKey: key })),
    [client],
  );
  return { rooms: query.data ?? [], isLoading: query.isPending };
}
