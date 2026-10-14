"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicRoom } from "@/game/types";

/** How long a change shows (a new card's entrance, a seat's pop and its name). */
const SHOWN_MS = 2000;

export interface RoomChanges {
  /** Rooms that just appeared on the list. */
  entered: ReadonlySet<string>;
  /** Rooms where someone just sat down: their seat and name. */
  sat: ReadonlyMap<string, { seat: number; name: string }>;
}

/**
 * What changed in a room list since the last time it came in: rooms that
 * just opened, and seats just taken (with who took them), each for a moment.
 * The first list that comes in shows as it is, with nothing new.
 */
export function useRoomChanges(
  rooms: PublicRoom[],
  ready: boolean,
): RoomChanges {
  const before = useRef<Map<string, number> | null>(null);
  const [entered, setEntered] = useState<ReadonlySet<string>>(new Set());
  const [sat, setSat] = useState<RoomChanges["sat"]>(new Map());
  const timers = useRef(new Set<number>());

  useEffect(() => {
    if (!ready) return;
    const had = before.current;
    before.current = new Map(rooms.map((r) => [r.code, r.players]));
    if (!had) return;
    const comeIn: string[] = [];
    const tookSeat: [string, { seat: number; name: string }][] = [];
    for (const r of rooms) {
      const was = had.get(r.code);
      if (was === undefined) comeIn.push(r.code);
      else if (r.players > was)
        tookSeat.push([
          r.code,
          { seat: r.players - 1, name: r.seated[r.players - 1]?.name ?? "" },
        ]);
    }
    if (!comeIn.length && !tookSeat.length) return;
    setEntered((s) => new Set([...s, ...comeIn]));
    setSat((m) => new Map([...m, ...tookSeat]));
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      setEntered((s) => new Set([...s].filter((c) => !comeIn.includes(c))));
      setSat(
        (m) =>
          new Map(
            [...m].filter(
              ([code, v]) =>
                !tookSeat.some(([c, w]) => c === code && w.seat === v.seat),
            ),
          ),
      );
    }, SHOWN_MS);
    timers.current.add(id);
  }, [rooms, ready]);

  useEffect(() => {
    const live = timers.current;
    return () => {
      for (const id of live) window.clearTimeout(id);
    };
  }, []);

  return { entered, sat };
}
