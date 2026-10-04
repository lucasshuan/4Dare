"use client";

import type { AnimationSequence } from "motion/react";
import { Avatar } from "@/components/ui/avatar";
import type { Person } from "@/components/ui/player-name";
import { gs, mirror } from "@/lib/motion";

/** Space kept clear around each face on the circle (radians, ≈25.2°). */
export const RING_GAP = 0.44;

export interface RingArc {
  /** Index (in turn order) of the player the arc starts at: they pick for the next one. */
  from: number;
  /** SVG path of the arc, clockwise. */
  d: string;
  /** Its length, for drawing it with the dash offset. */
  length: number;
  /** Where the arrowhead sits and which way it points (tangent, clockwise). */
  head: { x: number; y: number; deg: number };
}

export interface RingGeometry {
  /** Circle radius. */
  R: number;
  /** Face size. */
  A: number;
  /** The ring's box (square). */
  size: number;
  /** Face centres, in turn order: the first at the top, then clockwise. */
  seats: { x: number; y: number }[];
  /** One arc per player, from them to the one they pick for. */
  arcs: RingArc[];
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * The circle of who picks for whom (spec B §3.2, generalised to 2-4 players):
 * faces on a circle in turn order, each arc running clockwise from a player
 * to the next one, who they pick for.
 */
export function ringGeometry(n: number, phone: boolean): RingGeometry {
  const R = phone ? 62 : 74;
  const A = phone ? 34 : 40;
  const size = 2 * R + A + 24;
  const c = size / 2;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const at = (a: number) => ({
    x: r2(c + R * Math.cos(a)),
    y: r2(c + R * Math.sin(a)),
  });
  const seats = Array.from({ length: n }, (_, i) => at(angle(i)));
  const arcs = Array.from({ length: n }, (_, i): RingArc => {
    // the next angle is not wrapped, so the arc always runs forwards
    const a1 = angle(i) + RING_GAP;
    const a2 = angle(i + 1) - RING_GAP;
    const p1 = at(a1);
    const p2 = at(a2);
    return {
      from: i,
      d: `M${p1.x} ${p1.y}A${R} ${R} 0 0 1 ${p2.x} ${p2.y}`,
      length: r2(R * (a2 - a1)),
      head: { ...p2, deg: r2((a2 * 180) / Math.PI + 90) },
    };
  });
  return { R, A, size, seats, arcs };
}

/** The arrowhead for a stroke of width `w`, pointing along +x. */
const headPath = (w: number) =>
  `M${-(w + 3)} ${-(w + 2.5)}L${w + 1.5} 0L${-(w + 3)} ${w + 2.5}`;

const BASE_W = 2;
const MINE_W = 4.5;

/**
 * The ring with its caption. Rendered in its from state (faces, arcs and
 * heads hidden); `ringSequence` builds it. Your arc is drawn again on top in
 * your target's colour, and the two faces it joins light up.
 */
export function WhoRing({
  players,
  youIndex,
  color,
  phone,
  label,
  caption,
}: {
  /** Everyone, in turn order. */
  players: Person[];
  youIndex: number;
  /** Your target's seat colour. */
  color: string;
  phone: boolean;
  label: string;
  caption: string;
}) {
  const g = ringGeometry(players.length, phone);
  const mine = g.arcs[youIndex];
  const target = (youIndex + 1) % players.length;
  return (
    <div
      data-ring-box
      className="flex flex-col items-center gap-1"
      style={{ opacity: 0 }}
    >
      <div
        role="img"
        aria-label={label}
        className="relative"
        style={{ width: g.size, height: g.size }}
      >
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${g.size} ${g.size}`}
          className="absolute inset-0 overflow-visible"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {g.arcs.map((a) => (
            <Arc key={a.from} arc={a} w={BASE_W} stroke="var(--line-strong)" />
          ))}
          {mine ? <Arc arc={mine} w={MINE_W} stroke={color} mine /> : null}
        </svg>
        {players.map((p, i) => {
          const seat = g.seats[i];
          const lit = i === youIndex ? "you" : i === target ? "target" : null;
          return (
            <span
              key={`${i}-${p.name ?? p.guestNumber}`}
              data-ring-face={i}
              className="absolute flex rounded-pill"
              style={{
                left: seat.x - g.A / 2,
                top: seat.y - g.A / 2,
                transform: "scale(0)",
              }}
            >
              <Avatar
                avatar={p.avatar}
                isGuest={p.isGuest}
                name={p.name}
                size={phone ? 34 : 40}
              />
              {lit ? (
                <span
                  data-ring-lit={lit}
                  className="pointer-events-none absolute inset-0 rounded-pill"
                  style={{ boxShadow: `0 0 0 3px ${color}`, opacity: 0 }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      <span className="font-semibold text-ink-muted text-sm">{caption}</span>
    </div>
  );
}

function Arc({
  arc,
  w,
  stroke,
  mine = false,
}: {
  arc: RingArc;
  w: number;
  stroke: string;
  mine?: boolean;
}) {
  return (
    <>
      <path
        {...(mine ? { "data-mine": "" } : { "data-arc": arc.from })}
        d={arc.d}
        stroke={stroke}
        strokeWidth={w}
        style={{
          strokeDasharray: arc.length,
          strokeDashoffset: arc.length,
          opacity: 0,
        }}
      />
      <g
        transform={`translate(${arc.head.x} ${arc.head.y}) rotate(${arc.head.deg})`}
      >
        <path
          {...(mine ? { "data-mine-head": "" } : { "data-arc-head": arc.from })}
          d={headPath(w)}
          stroke={stroke}
          strokeWidth={w}
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            transform: "scale(0)",
          }}
        />
      </g>
    </>
  );
}

/** Scene time → timeline time: where a moment of the choreography lands, and how long a stretch lasts. */
export interface TimeMap {
  at: (t: number) => number;
  d: (s: number) => number;
}

/** When the ring builds itself, in its scene's seconds (spec B §3.3; later matches: drawn from the start). */
export function ringTimes(n: number, first: boolean) {
  if (!first) return { box: 0, faces: 0, arc: 0, step: 0, lit: 0.5 };
  const T = 1.3;
  return {
    box: T,
    faces: T,
    arc: T + 0.22,
    step: 0.13,
    lit: T + 0.22 + 0.13 * n + 0.15,
  };
}

/**
 * The ring's part of the scene's timeline: the box fades in, the faces pop in
 * turn order, the arrows run round, then yours lights up with the two faces it
 * joins. Later matches show it drawn at once and only light yours. Reduced
 * motion: the ring fades in drawn, yours and the two face rings fade in.
 */
export function ringSequence(
  scope: HTMLElement,
  o: { first: boolean; reduced: boolean; map: TimeMap },
): AnimationSequence {
  const { at, d } = o.map;
  const box = scope.querySelector<HTMLElement>("[data-ring-box]");
  if (!box) return [];
  const faces = [...scope.querySelectorAll<HTMLElement>("[data-ring-face]")];
  const arcs = [...scope.querySelectorAll<SVGPathElement>("[data-arc]")];
  const heads = [...scope.querySelectorAll<SVGPathElement>("[data-arc-head]")];
  const mine = scope.querySelector<SVGPathElement>("[data-mine]");
  const mineHead = scope.querySelector<SVGPathElement>("[data-mine-head]");
  const litYou = scope.querySelector<HTMLElement>('[data-ring-lit="you"]');
  const litTarget = scope.querySelector<HTMLElement>(
    '[data-ring-lit="target"]',
  );
  const len = (p: SVGPathElement) => Number(p.style.strokeDasharray) || 0;
  const tm = ringTimes(faces.length, o.first);
  const seq: AnimationSequence = [];
  const drawnAt = (t: number) => {
    // set at once: everything already drawn
    for (const f of faces)
      seq.push([f, { scale: [1, 1] }, { at: at(t), duration: 0.01 }]);
    for (const p of arcs)
      seq.push([
        p,
        { strokeDashoffset: [0, 0], opacity: [1, 1] },
        { at: at(t), duration: 0.01 },
      ]);
    for (const h of heads)
      seq.push([h, { scale: [1, 1] }, { at: at(t), duration: 0.01 }]);
  };

  if (o.reduced) {
    seq.push([box, { opacity: [0, 1] }, { at: at(tm.box), duration: 0.3 }]);
    drawnAt(tm.box);
    if (mine)
      seq.push([
        mine,
        { strokeDashoffset: [0, 0], opacity: [0, 1] },
        { at: at(tm.lit), duration: 0.2 },
      ]);
    if (mineHead)
      seq.push([
        mineHead,
        { scale: [1, 1] },
        { at: at(tm.lit), duration: 0.01 },
      ]);
    for (const l of [litYou, litTarget])
      if (l)
        seq.push([l, { opacity: [0, 1] }, { at: at(tm.lit), duration: 0.2 }]);
    return seq;
  }

  seq.push([
    box,
    { opacity: [0, 1] },
    { at: at(tm.box), duration: d(0.2), ease: gs.p1Out },
  ]);
  if (o.first) {
    faces.forEach((f, i) => {
      seq.push([
        f,
        { scale: [0, 1] },
        {
          at: at(tm.faces + 0.07 * i),
          duration: d(0.35),
          ease: gs.backOut(2.6),
        },
      ]);
    });
    arcs.forEach((p, i) => {
      const t = tm.arc + tm.step * i;
      seq.push([
        p,
        { strokeDashoffset: [len(p), 0], opacity: [0, 1] },
        { at: at(t), duration: d(0.16), ease: "linear" },
      ]);
      const h = heads[i];
      if (h)
        seq.push([
          h,
          { scale: [0, 1] },
          { at: at(t + 0.14), duration: d(0.2), ease: gs.backOut(3) },
        ]);
    });
  } else drawnAt(tm.box);

  if (mine)
    seq.push([
      mine,
      { strokeDashoffset: [len(mine), 0], opacity: [0, 1] },
      { at: at(tm.lit), duration: d(0.3), ease: gs.p2Out },
    ]);
  if (mineHead)
    seq.push([
      mineHead,
      { scale: [0, 1] },
      { at: at(tm.lit + 0.26), duration: d(0.25), ease: gs.backOut(3) },
    ]);
  // your face lights up as your arrow is drawn, your target's as it lands
  for (const [lit, t] of [
    [litYou, tm.lit],
    [litTarget, tm.lit + 0.26],
  ] as const) {
    const face = lit?.parentElement;
    if (!lit || !face) continue;
    seq.push([
      lit,
      { opacity: [0, 1] },
      { at: at(t), duration: d(0.25), ease: gs.p1Out },
    ]);
    seq.push([
      face,
      { scale: [1, 1.15, 1] },
      { at: at(t), duration: d(0.24), ease: [gs.p2Out, mirror(gs.p2Out)] },
    ]);
  }
  return seq;
}
