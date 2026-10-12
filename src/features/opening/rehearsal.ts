"use client";

import { type Dispatch, type SetStateAction, useEffect } from "react";

// A start's ready check waits on each page's rehearsal: the title scene the
// match opens with, built behind the loading screen and drawn unseen at a few
// moments of it, so its pictures are decoded and its layers painted before it
// shows. Loading the files alone left all of that for the scene's first second.

/** The moments drawn, as parts of the scene's length; it ends back on its first frame. */
const MOMENTS = [0.15, 0.45, 0.8, 0] as const;
/** Frames each moment stays: the browser only draws a new one once the last is painted. */
const FRAMES = 3;

const rehearsals = new Map<number, { done: Promise<void>; end: () => void }>();

function rehearsal(key: number) {
  let r = rehearsals.get(key);
  if (!r) {
    // one start at a time: the last ones are over
    for (const old of rehearsals.keys()) if (old < key) rehearsals.delete(old);
    let end = () => {};
    const done = new Promise<void>((resolve) => {
      end = resolve;
    });
    r = { done, end };
    rehearsals.set(key, r);
  }
  return r;
}

/** Resolves once this page has rehearsed the opening of the start `key` (its ready check's `until`). */
export const rehearsed = (key: number) => rehearsal(key).done;

const frames = (n: number) =>
  new Promise<void>((done) => {
    const step = () => (--n <= 0 ? done() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });

/**
 * Runs the rehearsal of the start `key` once the scene is on the page and its
 * files are in (`loaded`): holds it at each moment for a few frames, then on
 * its first, and says it is done.
 */
export function useRehearsal(
  key: number | null,
  mounted: boolean,
  length: number,
  loaded: () => Promise<void>,
  setHold: Dispatch<SetStateAction<number>>,
) {
  useEffect(() => {
    if (key === null || !mounted) return;
    let live = true;
    void (async () => {
      await loaded();
      for (const at of MOMENTS) {
        if (!live) return;
        setHold(at * length);
        await frames(FRAMES);
      }
      if (live) rehearsal(key).end();
    })();
    return () => {
      live = false;
    };
  }, [key, mounted, length, loaded, setHold]);
}
