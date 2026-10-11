"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { type ServerClock, useClock } from "@/lib/hooks/use-server-clock";

/** How far a CSS animation may drift from the clock before it is put back (ms). */
const DRIFT = 60;
const RESYNC_MS = 1000;

/**
 * Plays every CSS animation inside `ref` on the server clock, t = 0 at
 * `startsAt`: the title scenes write their animation delays in seconds from
 * the beat's start, and an animation's current time counts from its creation,
 * delay included, so setting it to the time since the beat started lands each
 * one on the frame every other screen shows: after a reload, a late join or a
 * tab switch too. A stopped clock (the lab) holds them all at its moment.
 */
export function useSceneClock(
  ref: RefObject<HTMLElement | null>,
  startsAt: number,
) {
  const clock = useClock();
  const live = useRef({ clock, startsAt });
  live.current = { clock, startsAt };
  // after every render: a render may bring elements, and their animations, in
  useLayoutEffect(() => {
    sync(ref.current, live.current);
  });
  useEffect(() => {
    const tick = () => sync(ref.current, live.current);
    const back = () => {
      if (document.visibilityState === "visible") tick();
    };
    const id = window.setInterval(tick, RESYNC_MS);
    document.addEventListener("visibilitychange", back);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", back);
    };
  }, [ref]);
}

function sync(
  el: HTMLElement | null,
  { clock, startsAt }: { clock: ServerClock; startsAt: number },
) {
  if (!el) return;
  const t = clock.now() - startsAt;
  for (const a of el.getAnimations({ subtree: true })) {
    if (clock.frozen) {
      a.pause();
      a.currentTime = t;
      continue;
    }
    if (a.playbackRate !== clock.rate) a.playbackRate = clock.rate;
    const end = Number(a.effect?.getComputedTiming().endTime ?? 0);
    // an animation already over stays on its last frame
    if (a.playState === "finished" && t >= end) continue;
    if (a.playState !== "running") a.play();
    if (Math.abs(Number(a.currentTime ?? 0) - t) > DRIFT) a.currentTime = t;
  }
}
