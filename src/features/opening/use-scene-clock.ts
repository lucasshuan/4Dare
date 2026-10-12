"use client";

import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
 * tab switch too. A stopped clock (the lab) holds them all at its moment,
 * and so does `hold` (s into the scene), off the clock: the rehearsal.
 */
export function useSceneClock(
  ref: RefObject<HTMLElement | null>,
  startsAt: number,
  hold: number | null = null,
) {
  const clock = useClock();
  // the animations the rehearsal held, so letting go of the hold reaches them all
  const [held] = useState(() => new Set<Animation>());
  const live = useRef({ clock, startsAt, hold, held });
  live.current = { clock, startsAt, hold, held };
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
  {
    clock,
    startsAt,
    hold,
    held,
  }: {
    clock: ServerClock;
    startsAt: number;
    hold: number | null;
    held: Set<Animation>;
  },
) {
  if (!el) return;
  const t = hold === null ? clock.now() - startsAt : hold * 1000;
  const all = new Set(el.getAnimations({ subtree: true }));
  // one held at no speed before its delay (and filling only forwards) is out of
  // getAnimations: left there, it would stay put for good, a number never flying off
  for (const a of held)
    if (a.playState !== "idle" && isConnected(a)) all.add(a);
  if (hold === null) held.clear();
  for (const a of all) {
    if (hold !== null) {
      held.add(a);
      // held but still running, at no speed: what plays on the compositor once the
      // scene is on gets its layer now, not on its first visible frame
      if (a.playbackRate !== 0) a.playbackRate = 0;
      if (a.playState !== "running") a.play();
      a.currentTime = t;
      continue;
    }
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

const isConnected = (a: Animation) =>
  a.effect instanceof KeyframeEffect && !!a.effect.target?.isConnected;
