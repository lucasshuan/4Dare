"use client";

import { useSyncExternalStore } from "react";

/**
 * The room this page is on its way out of, after a "Leave": from the click
 * until the next page shows, the room keeps the screen it had, so the news of
 * the seat freed or the room closed (an empty room closes) never flashes
 * "This room doesn't exist" on the way out.
 */
let departing: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  if (next === departing) return;
  departing = next;
  for (const l of listeners) l();
}

/** On the way out of room `code`. */
export function departRoom(code: string) {
  set(code);
}

/** Not leaving `code` after all (the leave failed), or back in it. */
export function stayInRoom(code: string) {
  if (departing === code) set(null);
}

/** Whether this page is on its way out of room `code`. */
export function useDeparting(code: string): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => departing === code,
    () => false,
  );
}
