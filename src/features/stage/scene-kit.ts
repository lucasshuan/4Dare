"use client";

// Small pieces the opening and theme scenes share: a sequence builder with the
// reduced-motion rule built in, a re-render at a server moment, the show lookups,
// the people row of the cold open and the steps of the tie roulette.

import type { AnimationSequence, Easing } from "motion/react";
import { useEffect, useReducer } from "react";
import type { RoomView, ShowView } from "@/game/types";
import { useClock } from "@/lib/hooks/use-server-clock";

/** A scene fills the screen under the match header, so it can centre itself (the same sizes as PickIntro). */
export const SCENE_MIN_H =
  "min-h-[calc(100dvh-7rem-var(--dock))] short:min-h-[calc(100dvh-5.5rem-var(--dock))] sm:min-h-[calc(100dvh-7.5rem-var(--dock))] sm:short:min-h-[calc(100dvh-5.5rem-var(--dock))]";

/**
 * Fixed over the game's area: the window but the history sidebar on its left
 * (wide windows, `--sidebar`). The scenes over the screen (a guess's, the turn
 * band, the answers) sit here, under the chat (z-35) and under the match
 * header and the sidebar (z-38), so those never go.
 */
export const GAME_AREA = "fixed inset-y-0 right-0 left-[var(--sidebar)]";

/** The prototype's `.s-big`: the stage's big display lines. */
export const BIG =
  "font-display font-extrabold leading-[1.02] tracking-[-0.03em] text-balance";

type Value = string | number;
type Values = Record<string, Value | Value[]>;
type Target = Element | null | undefined;

/**
 * What a move becomes under reduced motion:
 * - "set": the moved values jump to their end at the same time and opacity
 *   fades there in 0.2 s (entrances: the jump happens while hidden);
 * - "fade": only the opacity fades, the move is dropped (dimming);
 * - "skip": nothing (pure flourishes: wiggles, grows).
 * A move that ends hidden always only fades.
 */
export type Still = "set" | "fade" | "skip";

const last = (v: Value | Value[]) => (Array.isArray(v) ? v[v.length - 1] : v);

/**
 * Builds a motion sequence with absolute times (s). Under reduced motion every
 * move turns into its still version at the same time, so all screens stay in
 * step whatever they draw.
 */
export class Timeline {
  readonly seq: AnimationSequence = [];
  constructor(readonly reduced: boolean) {}

  /**
   * A move of `target` (one element or a list) from `at` seconds. With a
   * list, `values` and `at` may be functions of the element's index (a
   * stagger, a tilt each).
   */
  to(
    target: Target | readonly Target[],
    valuesOf: Values | ((i: number) => Values),
    atOf: number | ((i: number) => number),
    duration: number,
    ease?: Easing | Easing[],
    still: Still = "set",
  ): this {
    const els = (Array.isArray(target) ? target : [target]).filter(
      (e): e is Element => !!e,
    );
    for (const [i, el] of els.entries()) {
      const values = typeof valuesOf === "function" ? valuesOf(i) : valuesOf;
      const at = typeof atOf === "function" ? atOf(i) : atOf;
      if (!this.reduced) {
        this.seq.push([el, values, { at, duration, ease }]);
        continue;
      }
      if (still === "skip") continue;
      const { opacity, ...moved } = values;
      const hidden = opacity !== undefined && Number(last(opacity)) === 0;
      if (still === "set" && !hidden && Object.keys(moved).length)
        this.seq.push([
          el,
          Object.fromEntries(
            Object.entries(moved).map(([k, v]) => [k, last(v)]),
          ),
          { at, duration: 0 },
        ]);
      if (opacity !== undefined)
        this.seq.push([
          el,
          {
            opacity: Array.isArray(opacity)
              ? [opacity[0], last(opacity)]
              : opacity,
          },
          { at, duration: 0.2 },
        ]);
    }
    return this;
  }
}

/** The elements of a scene marked with `data-<name>` (optionally equal to `value`). */
export function marked<T extends HTMLElement = HTMLElement>(
  scope: HTMLElement,
  name: string,
  value?: string,
): T[] {
  const sel =
    value === undefined ? `[data-${name}]` : `[data-${name}="${value}"]`;
  return [...scope.querySelectorAll<T>(sel)];
}

/**
 * Whether the server time `at` has come, re-rendering once when it does (one
 * timer, never a ticking clock). A stopped clock (the lab) is read as drawn.
 */
export function useAfter(at: number | null): boolean {
  const clock = useClock();
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const reached = at !== null && clock.now() >= at;
  useEffect(() => {
    if (at === null || clock.frozen) return;
    const wait = (at - clock.now()) / clock.rate;
    if (wait <= 0) return;
    const id = window.setTimeout(bump, wait + 5);
    return () => window.clearTimeout(id);
  }, [at, clock]);
  return reached;
}

/** Calls `fire` at server time `at` when it comes live; never for a moment already past on mount (a reload), nor on a stopped clock. */
export function useFireAt(at: number, fire: () => void) {
  const clock = useClock();
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once per moment, whatever the callback's identity
  useEffect(() => {
    if (clock.frozen) return;
    const wait = (at - clock.now()) / clock.rate;
    if (wait < -300) return;
    const id = window.setTimeout(fire, Math.max(0, wait));
    return () => window.clearTimeout(id);
  }, [at, clock]);
}

/** The show of that kind the view carries: the current one, or the one still playing before it. */
export function showOf(
  view: RoomView,
  kind: ShowView["kind"],
): ShowView | null {
  const r = view.reveal;
  if (
    !r ||
    (r.kind !== "opening" &&
      r.kind !== "theme" &&
      r.kind !== "cast" &&
      r.kind !== "deal")
  )
    return null;
  if (r.kind === kind) return r;
  return r.prev?.kind === kind ? r.prev : null;
}

/** A beat's length in seconds. */
export const beatSeconds = (b: { startsAt: number; until: number }) =>
  (b.until - b.startsAt) / 1000;

/**
 * The cold open's row: you at index floor((n − 1) / 2), the players after you
 * (in seat order, wrapping round) to your right, the rest to your left.
 * `next` are the first two after you, who get the answer chips.
 */
export function peopleRow<T extends { id: string }>(
  players: readonly T[],
  youId: string,
): { row: T[]; next: T[] } {
  const at = Math.max(
    0,
    players.findIndex((p) => p.id === youId),
  );
  const you = players[at];
  if (!you) return { row: [], next: [] };
  const others = [...players.slice(at + 1), ...players.slice(0, at)];
  const right = others.length - Math.floor((players.length - 1) / 2);
  return {
    row: [...others.slice(right), you, ...others.slice(0, right)],
    next: others.slice(0, 2),
  };
}

/**
 * The tie roulette: which tied option is lit from when (ms into the spin).
 * Steps slow down towards the end (quadratic spacing) and the last one lands
 * on the chosen option. Every screen computes the same thing.
 */
export function rouletteSteps(
  tied: readonly number[],
  chosen: number,
  spinMs: number,
): { at: number; lit: number }[] {
  const options = tied.length ? tied : [chosen];
  const steps = options.length * 4;
  const n = options.length;
  const start = (((options.indexOf(chosen) - steps) % n) + n) % n;
  return Array.from({ length: steps + 1 }, (_, i) => ({
    at: spinMs * (i / steps) ** 2,
    lit: options[(start + i) % n],
  }));
}
