"use client";

import { useSyncExternalStore } from "react";

// The time of the newest news post this browser has seen, so the side menu
// can mark what came after it. Kept on the device only: losing it just shows
// the mark once more.
const KEY = "4dare.news-seen";
const listeners = new Set<() => void>();

const read = () => {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
};

/** Remembers that news up to `at` (ms) were seen. */
export function markNewsSeen(at: number) {
  try {
    if (read() >= at) return;
    window.localStorage.setItem(KEY, String(at));
  } catch {
    // storage refused: the mark shows again next time
  }
  for (const l of listeners) l();
}

/** Whether a post newer than the last one seen exists (`latest`, ms). */
export function useNewsFresh(latest: number | null | undefined) {
  const seen = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => Number.POSITIVE_INFINITY,
  );
  return !!latest && latest > seen;
}
