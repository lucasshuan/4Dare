"use client";

import {
  type AnimationPlaybackControls,
  type AnimationSequence,
  createScopedAnimate,
  useReducedMotionConfig,
} from "motion/react";
import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { useMedia } from "@/lib/hooks/use-media";
import { type ServerClock, useClock } from "@/lib/hooks/use-server-clock";

/** Phones: below Tailwind's `sm`. */
export const PHONE = "(max-width: 639.98px)";

export interface TimelineInfo {
  /** Reduced motion: build the still version (same times, 0.2 s fades to the end states). */
  reduced: boolean;
  /** Below `sm`: the phone layout's sizes and distances. */
  phone: boolean;
}

/** How far a playing timeline may drift from the server clock before it is put back (s). */
const DRIFT = 0.25;
const RESYNC_MS = 1000;
const RESIZE_MS = 150;

/**
 * A scene's choreography as one seekable motion sequence, played in step
 * with the server clock: the motion version of the prototype's GSAP timeline
 * and `tl.time(t)`. Every screen shows the same frame, and a reload, a late
 * join or a tab switch lands on it.
 *
 * - `build` gets the scope element after layout and returns the sequence,
 *   with absolute `at` times in seconds (t = 0 is `startsAt`). Measure there,
 *   with `layoutRect` rather than getBoundingClientRect: on a rebuild the
 *   elements may still wear the last frame's transforms.
 * - Render every element with its **from** styles inline, so nothing flashes
 *   before the build, and animate the same elements and values in the
 *   reduced build (or set them), since a rebuild cancels the old timeline.
 * - `startsAt` null: not started, the elements keep their from styles.
 *   Before it: paused at 0, played on time. Past the end: held at the end.
 * - Rebuilt, at the same time, when `deps`, reduced motion or the phone
 *   breakpoint change, when the scope is resized and once the fonts load.
 * - A stopped clock (the lab) holds the timeline at its moment.
 */
export function useStageTimeline<T extends HTMLElement>(opts: {
  /** Server ms of t = 0 (usually a beat's startsAt); null = not started. */
  startsAt: number | null;
  /** Called after layout with the scope element; returns a motion sequence (absolute `at` in seconds). */
  build: (scope: T, info: TimelineInfo) => AnimationSequence;
  /** Rebuild when these change (players, target, sizes, language). */
  deps: readonly unknown[];
}): RefObject<T | null> {
  const ref = useRef<T>(null);
  const clock = useClock();
  const reduced = useReducedMotionConfig() ?? false;
  const phone = useMedia(PHONE);
  const version = useVersion([...opts.deps, reduced, phone]);
  const live = useRef<Live<T> | null>(null);
  live.current ??= {
    controls: null,
    clock,
    startsAt: opts.startsAt,
    build: opts.build,
    info: { reduced, phone },
    playTimer: 0,
  };

  // the latest build, clock and start, for the timers and observers below
  useLayoutEffect(() => {
    const l = live.current;
    if (!l) return;
    l.build = opts.build;
    l.info = { reduced, phone };
    const moved = l.clock !== clock || l.startsAt !== opts.startsAt;
    l.clock = clock;
    l.startsAt = opts.startsAt;
    if (moved) sync(l);
  });

  // build (and rebuild) the timeline
  useLayoutEffect(() => {
    const l = live.current;
    const el = ref.current;
    if (!l || !el) return;
    l.version = version;
    create(l, el);
    return () => cancel(l);
  }, [version]);

  // rebuild on resize (debounced) and once the fonts are in
  useEffect(() => {
    const l = live.current;
    const el = ref.current;
    if (!l || !el) return;
    let timer = 0;
    let size = `${el.offsetWidth}x${el.offsetHeight}`;
    const rebuild = () => {
      if (ref.current === el) create(l, el);
    };
    const observer = new ResizeObserver(() => {
      const now = `${el.offsetWidth}x${el.offsetHeight}`;
      if (now === size) return;
      size = now;
      window.clearTimeout(timer);
      timer = window.setTimeout(rebuild, RESIZE_MS);
    });
    observer.observe(el);
    let fonts = document.fonts.status !== "loaded";
    if (fonts)
      void document.fonts.ready.then(() => {
        if (fonts) rebuild();
      });
    return () => {
      fonts = false;
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  // back on the clock after a tab switch, and every second against drift
  useEffect(() => {
    const l = live.current;
    if (!l) return;
    const back = () => {
      if (document.visibilityState === "visible") sync(l);
    };
    document.addEventListener("visibilitychange", back);
    const id = window.setInterval(() => sync(l), RESYNC_MS);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.clearInterval(id);
    };
  }, []);

  return ref;
}

interface Live<T extends HTMLElement> {
  controls: AnimationPlaybackControls | null;
  clock: ServerClock;
  startsAt: number | null;
  build: (scope: T, info: TimelineInfo) => AnimationSequence;
  info: TimelineInfo;
  playTimer: number;
  version?: number;
}

function create<T extends HTMLElement>(l: Live<T>, el: T) {
  // the old timeline goes first: its values fall back to their from styles,
  // and the new one is sought in the same task, so no frame shows the gap
  cancel(l);
  const sequence = l.build(el, l.info);
  if (!sequence.length) return;
  const animate = createScopedAnimate({
    scope: { current: el, animations: [] },
  });
  const controls = animate(sequence);
  controls.pause();
  l.controls = controls;
  sync(l);
}

function cancel<T extends HTMLElement>(l: Live<T>) {
  window.clearTimeout(l.playTimer);
  l.controls?.cancel();
  l.controls = null;
}

/** Puts the timeline where the server clock says, playing or held. */
function sync<T extends HTMLElement>(l: Live<T>) {
  const c = l.controls;
  if (!c) return;
  window.clearTimeout(l.playTimer);
  const end = c.duration;
  // pause before seeking: a running animation sought to its end would finish and drop its frame
  if (l.startsAt === null) {
    c.pause();
    c.time = 0;
    return;
  }
  const elapsed = (l.clock.now() - l.startsAt) / 1000;
  if (l.clock.frozen || elapsed < 0 || elapsed >= end) {
    const t = Math.min(end, Math.max(0, elapsed));
    if (c.state !== "paused" || Math.abs(c.time - t) > 0.001) {
      c.pause();
      c.time = t;
    }
    if (!l.clock.frozen && elapsed < 0)
      l.playTimer = window.setTimeout(
        () => sync(l),
        (-elapsed * 1000) / l.clock.rate,
      );
    return;
  }
  if (c.speed !== l.clock.rate) c.speed = l.clock.rate;
  if (c.state !== "running" || Math.abs(c.time - elapsed) > DRIFT)
    c.time = elapsed;
  c.play();
}

/** Counts changes of `deps` (shallow), so one effect can follow a list given at runtime. */
function useVersion(deps: readonly unknown[]) {
  const ref = useRef({ deps, version: 0 });
  const last = ref.current.deps;
  if (
    deps.length !== last.length ||
    deps.some((d, i) => !Object.is(d, last[i]))
  )
    ref.current = { deps, version: ref.current.version + 1 };
  return ref.current.version;
}

/**
 * An element's box inside `scope`, from layout alone: transforms (a timeline
 * mid-scene, inline from styles) don't move it, and a scaled parent doesn't
 * shrink it, so it is the distance a translate has to cover.
 */
export function layoutRect(el: HTMLElement, scope: HTMLElement) {
  const a = pageOffset(el);
  const b = pageOffset(scope);
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function pageOffset(el: HTMLElement) {
  let x = 0;
  let y = 0;
  for (
    let n: HTMLElement | null = el;
    n;
    n = n.offsetParent as HTMLElement | null
  ) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}
