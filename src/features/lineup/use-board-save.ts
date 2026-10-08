"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LuBoard } from "@/game/lineup/types";

/** Quiet for this long after a change, then save. */
const DEBOUNCE_MS = 600;
const RETRY_MS = 1000;

/**
 * Saves the board while its owner lays it out: a PUT to the room's board
 * route (never a Server Action, so "Done" never waits behind an autosave),
 * one request at a time, the newest board winning. What is still unsaved
 * goes out with keepalive when the page hides.
 */
export function useBoardSave(code: string) {
  const pending = useRef<LuBoard | null>(null);
  const busy = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  const send = useCallback(
    async (keepalive = false) => {
      window.clearTimeout(timer.current);
      const board = pending.current;
      if (!board || (busy.current && !keepalive)) return;
      pending.current = null;
      busy.current = true;
      try {
        const res = await fetch(`/api/rooms/${code}/board`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(board),
          keepalive,
        });
        // a full server or a lost race: try the newest board again soon
        if (!res.ok && res.status >= 500) {
          pending.current ??= board;
          timer.current = window.setTimeout(() => void send(), RETRY_MS);
        }
      } catch {
        pending.current ??= board;
        timer.current = window.setTimeout(() => void send(), RETRY_MS);
      } finally {
        busy.current = false;
        if (pending.current && !keepalive)
          timer.current = window.setTimeout(() => void send(), DEBOUNCE_MS);
      }
    },
    [code],
  );

  const save = useCallback(
    (board: LuBoard) => {
      pending.current = board;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void send(), DEBOUNCE_MS);
    },
    [send],
  );

  useEffect(() => {
    const flush = () => void send(true);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.clearTimeout(timer.current);
      flush();
    };
  }, [send]);

  return { save, flush: () => send() };
}
