"use client";

import type { AnimationSequence } from "motion/react";
import { BRAND, LogoMark } from "@/components/ui/logo";
import { layoutRect } from "@/features/stage/use-stage-timeline";
import { gs, mirror } from "@/lib/motion";
import type { TimeMap } from "./who-ring";

/**
 * The urn: the logo's 4 turned round (butter bubble, blue "?"), with the
 * comic shake marks beside it, outside the bubble so they don't tilt with it.
 * Rendered in its from state; `drawSequence` plays it.
 */
export function DrawUrn() {
  return (
    <div data-urn-box className="relative">
      <div
        data-urn
        className="h-[171.7px] w-[170px] sm:h-[232.3px] sm:w-[230px]"
        style={{
          transformOrigin: "50% 92%",
          opacity: 0,
          transform: "scale(0.3) rotate(-12deg)",
        }}
      >
        <LogoMark
          bubble={BRAND.butter}
          mark={BRAND.blue}
          className="size-full"
        />
      </div>
      {MARKS.map(({ key, className, left }) => (
        <span
          key={key}
          data-shake
          className={`pointer-events-none absolute w-[22px] rounded-pill border-[5px] border-transparent ${className}`}
          style={{
            opacity: 0,
            [left ? "borderLeftColor" : "borderRightColor"]:
              "var(--brand-butter)",
          }}
        />
      ))}
    </div>
  );
}

/** Two marks per side, k = 0 (inner) and 1 (outer): only the outer border is coloured, a curved ")" line. */
const MARKS = [
  {
    key: "l0",
    left: true,
    className: "top-[26%] h-[34%] -left-[22px] sm:-left-[30px]",
  },
  {
    key: "l1",
    left: true,
    className: "top-[32%] h-[24%] -left-[34px] sm:-left-[46px]",
  },
  {
    key: "r0",
    left: false,
    className: "top-[26%] h-[34%] -right-[22px] sm:-right-[30px]",
  },
  {
    key: "r1",
    left: false,
    className: "top-[32%] h-[24%] -right-[34px] sm:-right-[46px]",
  },
] as const;

/** When each part of the draw plays, in the scene's seconds. */
export interface DrawTimes {
  line: number;
  lineDur: number;
  urn: number;
  urnDur: number;
  row: number;
  rowDur: number;
  rowStagger: number;
  /** Start of each avatar's hop, in turn order. */
  hops: number[];
  hopDur: number;
  /** The urn's swallow squash (and the "?" hop), one per landing. */
  squashes: number[];
  anticipation: number;
  anticipationDur: number;
  shake: number;
  shakeDur: number;
  marks: number;
  marksDur: number;
  slosh: number;
  lineOut: number;
  swell: number;
  swellDur: number;
  /** The squeeze, and the slip's launch from the bubble's mouth. */
  slip: number;
  slipDur: number;
  /** The slip comes in front of the bubble ("it rises from behind it"). */
  front: number;
  urnOut: number;
  rowOut: number;
}

const SQUASH = 0.16;
const SHAKE = 1.15;

/**
 * The draw's schedule (spec B §2.3). First match: the prototype's times, hops
 * at 1.40 + 0.22·i. The anticipation waits for the last swallow squash
 * (`max(2.45, lastSquashEnd)`), so the two never touch the urn at once; the
 * shake follows it and still ends before the swell (3.85), so with 3-4
 * players it plays its keyframes a little faster. Later matches (3 s): the
 * avatars hop together, one 0.6 s shake, the slip out at 2.35.
 */
export function drawTimes(n: number, first: boolean): DrawTimes {
  if (!first) {
    const hop = 0.72;
    const squash = hop + 0.55;
    const anticipation = squash + SQUASH;
    const shake = anticipation + 0.12;
    return {
      line: 0.05,
      lineDur: 0.4,
      urn: 0.1,
      urnDur: 0.5,
      row: 0.2,
      rowDur: 0.35,
      rowStagger: 0.05,
      hops: Array.from({ length: n }, () => hop),
      hopDur: 0.6,
      squashes: [squash],
      anticipation,
      anticipationDur: 0.12,
      shake,
      shakeDur: 0.6,
      marks: shake + 0.02,
      marksDur: 0.58,
      slosh: shake + 0.05,
      lineOut: 1.8,
      swell: shake + 0.6,
      swellDur: 0.2,
      slip: shake + 0.8,
      slipDur: 0.6,
      front: shake + 0.97,
      urnOut: shake + 0.97,
      rowOut: 2.4,
    };
  }
  const hops = Array.from({ length: n }, (_, i) => r3(1.4 + 0.22 * i));
  const squashes = hops.map((h) => r3(h + 0.55));
  const lastSquashEnd = (squashes.at(-1) ?? 0) + SQUASH;
  const anticipation = r3(Math.max(2.45, lastSquashEnd));
  const shake = r3(anticipation + 0.22);
  const swell = 3.85;
  const shakeDur = r3(Math.min(SHAKE, swell - shake));
  return {
    line: 0.2,
    lineDur: 0.5,
    urn: 0.3,
    urnDur: 0.7,
    row: 0.6,
    rowDur: 0.45,
    rowStagger: 0.07,
    hops,
    hopDur: 0.6,
    squashes,
    anticipation,
    anticipationDur: 0.22,
    shake,
    shakeDur,
    marks: r3(shake + 0.03),
    marksDur: r3((1.1 * shakeDur) / SHAKE),
    slosh: r3(shake + 0.08),
    lineOut: 3.4,
    swell,
    swellDur: 0.28,
    slip: 4.13,
    slipDur: 0.6,
    front: 4.3,
    urnOut: 4.3,
    rowOut: 4.2,
  };
}

const r3 = (v: number) => Math.round(v * 1000) / 1000 + 0;

/**
 * A hop as keyframes: a straight "tent" (up to 90 px above the landing at
 * half way, then down), travelled with power1.inOut over the whole trip,
 * like GSAP's keyframes with an outer ease. Sampled, so every stretch
 * between samples is linear; the apex is one of the samples.
 */
export function hopFrames(dx: number, dy: number, samples = 17) {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < samples; i++) {
    const p = gs.p1InOut(i / (samples - 1));
    x.push(r3(dx * p));
    y.push(r3(p <= 0.5 ? (dy - 90) * 2 * p : dy - 90 + 90 * 2 * (p - 0.5)));
  }
  return { x, y };
}

const SHAKE_URN = {
  rotate: [0, -11, 10, -9, 8, -6, 5, -3, 0],
  x: [0, -10, 10, -9, 8, -6, 4, -2, 0],
  scaleX: [0.9, 1.06, 0.95, 1.06, 0.96, 1.04, 0.98, 1.02, 1],
  scaleY: [1.1, 0.94, 1.05, 0.94, 1.04, 0.96, 1.02, 0.99, 1],
};
/** The "?" sloshing inside, in viewBox units. */
const SLOSH_Q = {
  rotate: [0, 16, -15, 13, -11, 9, -6, 3, 0],
  x: [0, 10, -10, 9, -8, 6, -4, 2, 0],
};

/**
 * The draw's part of the timeline: the line, the urn and the row come in,
 * the avatars hop into the bubble (it swallows each one), it takes a breath,
 * shakes on its tail, swells, squeezes and spits out the slip (`[data-slip]`,
 * the target header itself), which rises straight from the bubble's mouth to
 * its place, growing from 0.15 to 1, behind the bubble until `front`.
 * Reduced motion: everything fades in still, and at the launch the draw
 * fades out while the slip fades in where it stays.
 */
export function drawSequence(
  scope: HTMLElement,
  o: { times: DrawTimes; reduced: boolean; map: TimeMap },
): AnimationSequence {
  const { times: tm, map } = o;
  const { at, d } = map;
  const line = scope.querySelector<HTMLElement>("[data-draw-line]");
  const urn = scope.querySelector<HTMLElement>("[data-urn]");
  const q = urn?.querySelector<SVGPathElement>("[data-q]");
  const row = scope.querySelector<HTMLElement>("[data-draw-row]");
  const slip = scope.querySelector<HTMLElement>("[data-slip]");
  if (!line || !urn || !q || !row || !slip) return [];
  const avatars = [...scope.querySelectorAll<HTMLElement>("[data-draw-av]")];
  const marks = [...scope.querySelectorAll<HTMLElement>("[data-shake]")];

  // measured before anything moves (layout only: from styles don't count)
  const u = layoutRect(urn, scope);
  const s = layoutRect(slip, scope);
  const mouth = u.y + 0.2 * u.height;
  const slipFrom = r3(mouth - (s.y + s.height / 2));

  // the slip is behind the bubble until it has risen past it
  const front = at(tm.front);
  const seq: AnimationSequence = [
    [
      (v: number) => {
        slip.style.zIndex = v >= front ? "2" : "0";
      },
      [0, front + 0.01],
      { at: 0, duration: front + 0.01, ease: "linear" },
    ],
  ];

  if (o.reduced) {
    const fade = (
      el: Element,
      t: number,
      from: number,
      to: number,
      extra = {},
    ) =>
      seq.push([
        el,
        { opacity: [from, to], ...extra },
        { at: at(t), duration: 0.2 },
      ]);
    fade(line, tm.line, 0, 1, { y: [0, 0] });
    fade(urn, tm.urn, 0, 1, { scaleX: [1, 1], scaleY: [1, 1], rotate: [0, 0] });
    for (const a of avatars) fade(a, tm.row, 0, 1, { y: [0, 0] });
    for (const el of [line, urn, row])
      seq.push([el, { opacity: [1, 0] }, { at: at(tm.slip), duration: 0.3 }]);
    seq.push([
      slip,
      { opacity: [0, 1], y: [0, 0], scaleX: [1, 1], scaleY: [1, 1] },
      { at: at(tm.slip), duration: 0.3 },
    ]);
    return seq;
  }

  seq.push(
    [
      line,
      { opacity: [0, 1], y: [24, 0] },
      { at: at(tm.line), duration: d(tm.lineDur), ease: gs.p3Out },
    ],
    [
      urn,
      { scaleX: [0.3, 1], scaleY: [0.3, 1], opacity: [0, 1], rotate: [-12, 0] },
      { at: at(tm.urn), duration: d(tm.urnDur), ease: gs.backOut(1.7) },
    ],
  );
  avatars.forEach((a, i) => {
    seq.push([
      a,
      { y: [40, 0], opacity: [0, 1] },
      {
        at: at(tm.row + tm.rowStagger * i),
        duration: d(tm.rowDur),
        ease: gs.backOut(2),
      },
    ]);
    // the hop: into the bubble's upper body
    const r = layoutRect(a, scope);
    const dx = u.x + u.width / 2 - (r.x + r.width / 2);
    const dy = u.y + 0.32 * u.height - (r.y + r.height / 2);
    const path = hopFrames(dx, dy);
    const hop = tm.hops[i] ?? tm.hops[0];
    seq.push(
      [
        a,
        { x: path.x, y: path.y, scaleX: [1, 0.35], scaleY: [1, 0.35] },
        {
          at: at(hop),
          duration: d(tm.hopDur),
          ease: "linear",
          scaleX: { ease: gs.p1InOut },
          scaleY: { ease: gs.p1InOut },
        },
      ],
      [
        a,
        { opacity: [1, 0] },
        { at: at(hop + 0.5), duration: d(0.12), ease: gs.p1Out },
      ],
    );
  });
  // the bubble swallows: a squash, and the "?" inside hops
  for (const t of tm.squashes) {
    seq.push(
      [
        urn,
        { scaleY: [1, 0.92, 1], scaleX: [1, 1.06, 1] },
        { at: at(t), duration: d(SQUASH), ease: [gs.p1Out, mirror(gs.p1Out)] },
      ],
      [
        q,
        { y: [0, -18, 0] },
        { at: at(t), duration: d(0.2), ease: [gs.p2Out, mirror(gs.p2Out)] },
      ],
    );
  }
  // it takes a breath, then shakes on its tail like a jar, the "?" sloshing a beat behind
  seq.push(
    [
      urn,
      { scaleX: [1, 0.9], scaleY: [1, 1.1] },
      {
        at: at(tm.anticipation),
        duration: d(tm.anticipationDur),
        ease: gs.p2Out,
      },
    ],
    [
      urn,
      SHAKE_URN,
      { at: at(tm.shake), duration: d(tm.shakeDur), ease: gs.sineInOut },
    ],
    [
      q,
      SLOSH_Q,
      { at: at(tm.slosh), duration: d(tm.shakeDur), ease: gs.sineInOut },
    ],
    [
      line,
      { opacity: [1, 0], y: [0, -16] },
      { at: at(tm.lineOut), duration: d(0.3), ease: gs.p1Out },
    ],
  );
  for (const m of marks)
    seq.push([
      m,
      {
        opacity: [0, 1, 0.2, 1, 0.3, 1, 0],
        scaleX: [0.6, 1, 0.9, 1.05, 0.9, 1, 0.8],
        scaleY: [0.6, 1, 0.9, 1.05, 0.9, 1, 0.8],
      },
      { at: at(tm.marks), duration: d(tm.marksDur), ease: gs.p1InOut },
    ]);
  // it swells, squeezes and spits the slip out of its top, straight up to where it stays
  seq.push(
    [
      urn,
      { scaleX: [1, 1.16], scaleY: [1, 1.16] },
      { at: at(tm.swell), duration: d(tm.swellDur), ease: gs.p2In },
    ],
    [
      q,
      { scaleX: [1, 1.35], scaleY: [1, 1.35] },
      { at: at(tm.swell), duration: d(tm.swellDur), ease: gs.p2In },
    ],
    [
      urn,
      { scaleX: [1.16, 1.22], scaleY: [1.16, 0.82] },
      { at: at(tm.slip), duration: d(0.1), ease: gs.p3Out },
    ],
    [
      q,
      { scaleX: [1.35, 0], scaleY: [1.35, 0] },
      { at: at(tm.slip), duration: d(0.12), ease: gs.p2In },
    ],
    [
      slip,
      {
        y: [slipFrom, 0],
        scaleX: [0.15, 1],
        scaleY: [0.15, 1],
        opacity: [0, 1],
      },
      { at: at(tm.slip), duration: d(tm.slipDur), ease: gs.backOut(1.4) },
    ],
    [
      row,
      { opacity: [1, 0], scaleX: [1, 0.85], scaleY: [1, 0.85] },
      { at: at(tm.rowOut), duration: d(0.4), ease: gs.p1Out },
    ],
    [
      urn,
      { scaleX: [1.22, 0.8], scaleY: [0.82, 0.8], opacity: [1, 0] },
      { at: at(tm.urnOut), duration: d(0.45), ease: gs.p2In },
    ],
  );
  return seq;
}
