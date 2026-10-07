"use client";

import { useEffect, useState } from "react";

/**
 * Plays `steps` on a loop, each for its `ms`, and gives the step showing and
 * how many loops have gone by. Holds on `still` while `paused`.
 *
 * A hidden tab holds the loop where it is and picks it up when it shows
 * again: there the browser stops animations but only slows timers, so steps
 * would keep changing with nothing playing them and pile up out of order.
 */
export function useStepLoop(
  steps: readonly { ms: number }[],
  still: number,
  paused = false,
) {
  const [at, setAt] = useState({ step: still, loop: 0 });

  useEffect(() => {
    if (paused) return setAt({ step: still, loop: 0 });
    let i = 0;
    let n = 0;
    let id: number | undefined;
    let due = 0;
    let left = 0;
    let started = false;
    const wait = (ms: number) => {
      window.clearTimeout(id);
      due = performance.now() + ms;
      id = window.setTimeout(next, ms);
    };
    const next = () => {
      setAt({ step: i, loop: n });
      wait(steps[i].ms);
      i = (i + 1) % steps.length;
      if (i === 0) n += 1;
    };
    const start = () => {
      started = true;
      next();
    };
    const onVisibility = () => {
      if (!started) {
        if (!document.hidden) start();
      } else if (document.hidden) {
        window.clearTimeout(id);
        left = Math.max(0, due - performance.now());
      } else {
        wait(left);
      }
    };
    // a tab opened in the background starts when it first shows
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [steps, still, paused]);

  return at;
}
