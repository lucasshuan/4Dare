"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { PlayerView, RoomView } from "@/game/types";

export interface RoomContextValue {
  code: string;
  view: RoomView;
  /** serverNow − local clock. */
  offset: number;
  /** Refetch the room now (call after an action succeeds). */
  refresh: () => Promise<void>;
  /** The server's current time, estimated from the local clock. */
  serverTime: () => number;
  me: PlayerView;
  playerById: (id: string | null | undefined) => PlayerView | undefined;
}

const RoomContext = createContext<RoomContextValue | null>(null);

export function RoomProvider({
  code,
  view,
  offset,
  refresh,
  children,
}: {
  code: string;
  view: RoomView;
  offset: number;
  refresh: () => Promise<void>;
  children: ReactNode;
}) {
  const value = useMemo<RoomContextValue>(() => {
    const byId = new Map(view.players.map((p) => [p.id, p]));
    const me = byId.get(view.youId);
    if (!me) throw new Error("viewer is not in the room view");
    return {
      code,
      view,
      offset,
      refresh,
      serverTime: () => Date.now() + offset,
      me,
      playerById: (id) => (id ? byId.get(id) : undefined),
    };
  }, [code, view, offset, refresh]);

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

/** Everything a room screen needs. Only usable under <RoomProvider>. */
export function useRoomContext(): RoomContextValue {
  const value = useContext(RoomContext);
  if (!value)
    throw new Error("useRoomContext must be used inside RoomProvider");
  return value;
}
