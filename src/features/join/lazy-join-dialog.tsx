"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { JoinRequest } from "./join-dialog";

const load = () => import("./join-dialog");
const JoinDialog = dynamic(() => load().then((m) => m.JoinDialog), {
  ssr: false,
});

/**
 * The join dialog, fetched the first time it's asked for (a press on "Play
 * now" or "Join"), then kept so it can close with its animation. The
 * browser fetches it once idle, so a press never waits on it.
 */
export function LazyJoinDialog({
  request,
  onClose,
}: {
  request: JoinRequest | null;
  onClose: () => void;
}) {
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") return;
    const id = window.requestIdleCallback(() => void load(), { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }, []);
  if (request && !asked) setAsked(true);
  return asked ? <JoinDialog request={request} onClose={onClose} /> : null;
}
