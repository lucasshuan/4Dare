"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useRoomContext } from "@/features/data/room-context";
import { markShown } from "@/server/actions";

/** A page out of sight this long is told to the room: a quick look at another tab is not. */
const HIDDEN_AFTER_MS = 1000;

function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

const isHidden = () => document.visibilityState === "hidden";

/**
 * Tells the room whether this player's page is in sight. A start doesn't
 * wait on a page in another tab or window: it plays on the server clock, and
 * the page lands where the match is once it shows again. Kept in step with
 * what the room says (a reload, a lost request), never with what was sent.
 */
export function useShownReport() {
  const { view, me, code, watching, apply, refresh } = useRoomContext();
  const hidden = useSyncExternalStore(subscribe, isHidden, () => false);
  const told = me.hidden;
  const seated = !watching && !me.away && view.phase !== "closed";
  const sending = useRef(false);
  useEffect(() => {
    if (!seated || hidden === told || sending.current) return;
    const send = async () => {
      sending.current = true;
      const r = await markShown(code, !hidden).catch(() => null);
      sending.current = false;
      // the room as it is now: what it says decides whether to tell it again
      if (r?.ok) apply(r.data);
      else void refresh();
    };
    if (!hidden) {
      void send();
      return;
    }
    const id = window.setTimeout(() => void send(), HIDDEN_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [seated, hidden, told, code, apply, refresh]);
}
