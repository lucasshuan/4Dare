"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { BACKEND } from "@/config";
import type { GameKey } from "@/game/games";
import type { PublicRoom } from "@/game/types";
import { subscribeLobby } from "@/lib/realtime";

/**
 * Something every home screen shows the same: fetched from `path` (with
 * `params`, e.g. the reader's language), refreshed when the room list changes.
 * With Supabase a ping says when it changed and the poll is only a safety net;
 * local mode has no pings and polls instead.
 */
function useLobbyFeed<T>(name: string, path: string, params = "") {
  const client = useQueryClient();
  // The list version the last ping announced: the CDN serves each version once fetched.
  const version = useRef<number | null>(null);
  const query = useQuery({
    queryKey: [name, params],
    queryFn: async (): Promise<T> => {
      const v = version.current;
      const search = [params, v ? `v=${v}` : ""].filter(Boolean).join("&");
      const res = await fetch(search ? `${path}?${search}` : path, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      return (await res.json()) as T;
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
        () => void client.invalidateQueries({ queryKey: [name] }),
        250,
      );
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [client, name]);
  return query;
}

/** Rooms waiting for players, for the home screen; hosts' names in the page's language. */
export function usePublicRooms() {
  const query = useLobbyFeed<{ rooms: PublicRoom[] }>(
    "public-rooms",
    "/api/rooms",
    `lang=${useLocale()}`,
  );
  return { rooms: query.data?.rooms ?? [], isLoading: query.isPending };
}

/** How many players have a room open right now (lobby, match or podium); null while loading. */
export function usePlayersOnline(game: GameKey): number | null {
  const query = useLobbyFeed<{ online: Partial<Record<GameKey, number>> }>(
    "players-online",
    "/api/online",
  );
  return query.data ? (query.data.online[game] ?? 0) : null;
}
