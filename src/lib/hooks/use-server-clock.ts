"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** Where the screens read the server's time. A room runs it from the local clock; the stage lab can stop it or slow it down. */
export interface ServerClock {
  /** The server's time now (ms). */
  now: () => number;
  /** Stopped at one moment (the lab): screens draw that moment and scene timelines pause there. */
  frozen: boolean;
  /** How fast it runs against the local clock: 1 in a room, slower in the lab. */
  rate: number;
}

export const ServerClockContext = createContext<ServerClock | null>(null);

/** The clock of the room around (RoomProvider), or the local clock + `offset` outside one. */
export function useClock(offset = 0): ServerClock {
  const clock = useContext(ServerClockContext);
  return clock ?? { now: () => Date.now() + offset, frozen: false, rate: 1 };
}

/**
 * The server's time, re-rendering every `everyMs`. Inside a room it reads the
 * room's clock (a stopped lab clock re-renders only when it is moved);
 * elsewhere it is the local clock + `offset`.
 */
export function useServerClock(offset: number, everyMs = 200) {
  const clock = useContext(ServerClockContext);
  const [now, setNow] = useState(() =>
    clock ? clock.now() : Date.now() + offset,
  );
  useEffect(() => {
    const read = clock ? clock.now : () => Date.now() + offset;
    setNow(read());
    if (clock?.frozen) return;
    const id = window.setInterval(() => setNow(read()), everyMs);
    return () => window.clearInterval(id);
  }, [clock, offset, everyMs]);
  // a stopped clock is read as it is drawn, so moving it shows at once
  return clock?.frozen ? clock.now() : now;
}
