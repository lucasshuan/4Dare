"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { PlayerView, RoomView } from "@/game/types";
import {
  type ServerClock,
  ServerClockContext,
} from "@/lib/hooks/use-server-clock";

export interface RoomContextValue {
  code: string;
  view: RoomView;
  /** serverNow − local clock. */
  offset: number;
  /** Refetch the room now. */
  refresh: () => Promise<void>;
  /** Show a room view an action returned (see useRoomAction). */
  apply: (view: RoomView) => void;
  /** The server's current time, estimated from the local clock (or the lab's clock). */
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
  apply,
  clock,
  children,
}: {
  code: string;
  view: RoomView;
  offset: number;
  refresh: () => Promise<void>;
  apply: (view: RoomView) => void;
  /** Another clock than the local one + `offset` (the stage lab's). */
  clock?: ServerClock;
  children: ReactNode;
}) {
  const roomClock = useMemo<ServerClock>(
    () => clock ?? { now: () => Date.now() + offset, frozen: false, rate: 1 },
    [clock, offset],
  );
  const value = useMemo<RoomContextValue>(() => {
    const byId = new Map(view.players.map((p) => [p.id, p]));
    const me = byId.get(view.youId);
    if (!me) throw new Error("viewer is not in the room view");
    return {
      code,
      view,
      offset,
      refresh,
      apply,
      serverTime: roomClock.now,
      me,
      playerById: (id) => (id ? byId.get(id) : undefined),
    };
  }, [code, view, offset, refresh, apply, roomClock]);

  return (
    <ServerClockContext.Provider value={roomClock}>
      <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
    </ServerClockContext.Provider>
  );
}

/** Everything a room screen needs. Only usable under <RoomProvider>. */
export function useRoomContext(): RoomContextValue {
  const value = useContext(RoomContext);
  if (!value)
    throw new Error("useRoomContext must be used inside RoomProvider");
  return value;
}
