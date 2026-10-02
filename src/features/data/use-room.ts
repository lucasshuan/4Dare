"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { BACKEND } from "@/config";
import type { RoomView } from "@/game/types";
import { subscribeRoom } from "@/lib/realtime";

export type RoomFetchError = "not_found" | "not_member" | "unknown";

export class RoomError extends Error {
  constructor(public code: RoomFetchError) {
    super(code);
    this.name = "RoomError";
  }
}

export interface RoomData {
  view: RoomView;
  /** serverNow − local clock, so `Date.now() + offset` is the server's time. */
  offset: number;
}

// Realtime pings make polling a safety net in Supabase mode; local mode has no pings.
const POLL_MS = BACKEND === "local" ? 1000 : 10_000;

export const roomKey = (code: string) => ["room", code] as const;

async function fetchRoom(code: string): Promise<RoomData> {
  const sentAt = Date.now();
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`, {
    cache: "no-store",
  });
  const receivedAt = Date.now();
  if (res.status === 404) throw new RoomError("not_found");
  if (res.status === 403) throw new RoomError("not_member");
  if (!res.ok) throw new RoomError("unknown");
  const view = (await res.json()) as RoomView;
  return { view, offset: view.serverNow - (sentAt + receivedAt) / 2 };
}

/** The room as the current player sees it, kept fresh by realtime pings, polling and the step clock. */
export function useRoom(code: string) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: roomKey(code),
    queryFn: async () => {
      const next = await fetchRoom(code);
      // A slow response must never replace a newer state.
      const current = client.getQueryData<RoomData>(roomKey(code));
      return current && current.view.version > next.view.version
        ? current
        : next;
    },
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    retry: (count, error) => !(error instanceof RoomError) && count < 2,
  });

  const refresh = useCallback(
    () => client.invalidateQueries({ queryKey: roomKey(code) }),
    [client, code],
  );

  /** Shows a room an action returned, unless a newer one is already on screen. */
  const apply = useCallback(
    (view: RoomView) => {
      client.setQueryData<RoomData>(roomKey(code), (current) =>
        current && current.view.version >= view.version
          ? current
          : { view, offset: current?.offset ?? view.serverNow - Date.now() },
      );
    },
    [client, code],
  );

  // A ping for a version we already have (usually our own action) needs no refetch.
  useEffect(
    () =>
      subscribeRoom(code, ({ version }) => {
        const current = client.getQueryData<RoomData>(roomKey(code));
        if (version && current && current.view.version >= version) return;
        void refresh();
      }),
    [client, code, refresh],
  );

  // When the step's clock runs out the server applies the timeout on the next read.
  const deadline = query.data?.view.deadline ?? null;
  const offset = query.data?.offset ?? 0;
  useEffect(() => {
    if (deadline === null) return;
    const wait = Math.max(0, deadline - (Date.now() + offset)) + 300;
    const id = window.setTimeout(() => void refresh(), wait);
    return () => window.clearTimeout(id);
  }, [deadline, offset, refresh]);

  const error =
    query.error instanceof RoomError
      ? query.error.code
      : query.error
        ? "unknown"
        : null;

  return {
    data: query.data ?? null,
    error: error as RoomFetchError | null,
    isLoading: query.isPending,
    refresh,
    apply,
  };
}
