"use client";

import { type CSSProperties, memo } from "react";
import { cn } from "@/lib/cn";
import s from "./lineup-title.module.css";
import { avatarSrc, litOf, seatOf, type TitleProps } from "./title-kit";
import type { TitleCue } from "./title-sound";
import { lineupTimes, sec } from "./title-timing";

export const LINEUP_SOUNDS = [
  "/opening/lineup-in.mp3",
  "/opening/lineup-first.mp3",
  "/opening/lineup-again.mp3",
];
export const LINEUP_IMAGES = ["/opening/pine.webp", "/opening/crown.svg"];

/**
 * The sounds: the lamp's switch as the room comes out of the dark, then one
 * mixed track (the whistle far away, the chalk scratching and writing, each
 * stroke in its own pitch, taps on the board, the eraser on a rematch).
 */
export function lineupCues(first: boolean): TitleCue[] {
  return [
    {
      src: first ? "/opening/lineup-first.mp3" : "/opening/lineup-again.mp3",
      at: 0,
      gain: 1,
      track: true,
    },
    { src: "/opening/lineup-in.mp3", at: 0, gain: 0.9 },
  ];
}

type Pt = { x: number; y: number };

/** Each board: the pitch in chalk, where the magnets go this match and where they were the last, the "?" in the goal. */
const BOARD = {
  landscape: {
    w: 1012,
    h: 512,
    pitch: [
      "M70 96H942V486H70Z",
      "M506 96V486",
      "M562 291a56 56 0 1 0-112 0a56 56 0 1 0 112 0",
      "M70 186H170V396H70",
      "M942 186H842V396H942",
      "M70 250H50V332H70M942 250H962V332H942",
    ],
    circle:
      "M892 248c34-2 52 20 50 44c-3 30-30 46-58 42c-30-4-44-28-40-52c4-22 22-34 44-36",
    erased: [
      ["M50 110C190 86 330 142 500 104", 84, 0.08],
      ["M660 152C740 134 820 170 890 148", 34, 0.07],
      ["M250 270C420 226 600 302 800 246", 104, 0.065],
      ["M120 410C220 392 320 428 420 404", 42, 0.075],
      ["M680 430C800 404 900 458 978 420", 66, 0.06],
      ["M530 66C570 58 610 74 650 64", 22, 0.07],
    ],
    smears: [
      "M560 120C640 180 700 220 780 230",
      "M300 430C380 400 470 420 560 380",
      "M820 150C860 220 880 300 900 360",
    ],
    mystery: { x: 870, y: 254 },
    next: [
      { x: 200, y: 291 },
      { x: 330, y: 176 },
      { x: 330, y: 406 },
      { x: 470, y: 291 },
      { x: 620, y: 190 },
      { x: 620, y: 392 },
      { x: 750, y: 291 },
      { x: 470, y: 140 },
    ],
    last: [
      { x: 260, y: 390 },
      { x: 430, y: 300 },
      { x: 290, y: 200 },
      { x: 580, y: 420 },
      { x: 520, y: 160 },
      { x: 700, y: 310 },
      { x: 790, y: 180 },
      { x: 380, y: 440 },
    ],
    goal: { x: 892, y: 291 },
    legs: [108, 1124],
    screws: [
      [108, 56],
      [1161, 56],
      [108, 604],
      [1161, 604],
    ],
    sticks: [210, 290],
  },
  // the same places turned 90° (attacking upwards), on the upright pitch's scale
  portrait: {
    w: 620,
    h: 1260,
    pitch: [
      "M40 1210V190H580V1210Z",
      "M40 700H580",
      "M374 700a64 64 0 1 0-128 0a64 64 0 1 0 128 0",
      "M170 1210V1075H450V1210",
      "M170 190V325H450V190",
      "M255 1210V1232H365V1210M255 190V168H365V190",
    ],
    circle:
      "M310 205c34-2 52 20 50 44c-3 30-30 46-58 42c-30-4-44-28-40-52c4-22 22-34 44-36",
    erased: [
      ["M40 143C160 114 300 176 470 130", 84, 0.08],
      ["M390 374C450 354 520 392 588 367", 34, 0.07],
      ["M50 627C200 576 380 671 584 603", 104, 0.065],
      ["M80 891C160 871 240 911 330 882", 42, 0.075],
      ["M290 1089C400 1060 500 1120 592 1078", 66, 0.06],
      ["M110 1195C150 1186 190 1203 232 1192", 22, 0.07],
    ],
    smears: [
      "M140 528C200 594 260 660 290 759",
      "M390 1012C450 968 510 979 550 902",
      "M470 330C490 418 510 506 520 594",
    ],
    mystery: { x: 288, y: 211 },
    next: [
      { x: 310, y: 1058 },
      { x: 151, y: 906 },
      { x: 469, y: 906 },
      { x: 310, y: 742 },
      { x: 170, y: 567 },
      { x: 450, y: 567 },
      { x: 310, y: 414 },
      { x: 101, y: 742 },
    ],
    last: [
      { x: 447, y: 988 },
      { x: 322, y: 789 },
      { x: 184, y: 953 },
      { x: 489, y: 613 },
      { x: 129, y: 684 },
      { x: 336, y: 473 },
      { x: 156, y: 368 },
      { x: 516, y: 847 },
    ],
    goal: { x: 310, y: 248 },
    legs: [24, 708],
    screws: [
      [24, 104],
      [745, 104],
      [24, 1528],
      [745, 1528],
    ],
    sticks: [90, 170],
  },
} as const;

/** The passes drawn between magnets: [from, to (or the goal), bend]. */
const LINKS: [number, number | "Q", number][] = [
  [0, 3, -46],
  [1, 4, 40],
  [2, 5, -40],
  [4, "Q", 34],
  [3, 6, 30],
];
/** The chalk dust falling off the underline: [left %, top %]. */
const DUST = [
  [8, 62],
  [22, 70],
  [37, 64],
  [52, 72],
  [66, 63],
  [80, 70],
  [92, 62],
] as const;

/** A chalk arrow from `a` to `b`, bent by `bend`, stopping `endGap` short of it. */
function arrow(a: Pt, b: Pt, bend: number, endGap: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  const st = { x: a.x + ux * 50, y: a.y + uy * 50 };
  const e = { x: b.x - ux * endGap, y: b.y - uy * endGap };
  const m = {
    x: (st.x + e.x) / 2 - uy * bend,
    y: (st.y + e.y) / 2 + ux * bend,
  };
  let tx = e.x - m.x;
  let ty = e.y - m.y;
  const tl = Math.sqrt(tx * tx + ty * ty) || 1;
  tx /= tl;
  ty /= tl;
  const c = Math.cos(0.5);
  const sn = Math.sin(0.5);
  const k = 16;
  const h1 = {
    x: e.x - k * (tx * c - ty * sn),
    y: e.y - k * (ty * c + tx * sn),
  };
  const h2 = {
    x: e.x - k * (tx * c + ty * sn),
    y: e.y - k * (ty * c - tx * sn),
  };
  const r = Math.round;
  return `M${r(st.x)} ${r(st.y)}Q${r(m.x)} ${r(m.y)} ${r(e.x)} ${r(e.y)}M${r(h1.x)} ${r(h1.y)}L${r(e.x)} ${r(e.y)}L${r(h2.x)} ${r(h2.y)}`;
}

function links(pos: readonly Pt[], goal: Pt, n: number) {
  return LINKS.filter(([a, b]) => a < n && (b === "Q" || b < n)).map(
    ([a, b, bend]) =>
      arrow(pos[a], b === "Q" ? goal : pos[b], bend, b === "Q" ? 62 : 54),
  );
}

/** The wallpaper: faded diamonds in cream and caramel with a brown outline and a dot in each. */
function Wall({ w, h }: { w: number; h: number }) {
  // past the canvas on every side, the same pattern carried on
  const W = w + 4000;
  const H = h + 4000;
  return (
    <svg
      className={s.wall}
      width={W}
      height={H}
      viewBox={`-2000 -2000 ${W} ${H}`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="lu-title-wall"
          width="64"
          height="96"
          patternUnits="userSpaceOnUse"
          x="-8"
          y="-20"
          patternTransform="scale(1.45)"
        >
          <rect width="64" height="96" fill="#c4834a" />
          <path d="M32 0L64 48L32 96L0 48Z" fill="#dfbf8a" />
          <path
            d="M32 16L53 48L32 80L11 48Z"
            fill="#e8cc98"
            fillOpacity=".55"
          />
          <path
            d="M0 0L64 96M64 0L0 96"
            stroke="#5e3518"
            strokeWidth="1.1"
            strokeOpacity=".45"
          />
          <path
            d="M32 0L64 48L32 96L0 48Z"
            fill="none"
            stroke="#6e4120"
            strokeWidth="2.2"
            strokeOpacity=".6"
          />
          <circle cx="32" cy="48" r="4.6" fill="#7a3f18" fillOpacity=".85" />
          <circle cx="0" cy="0" r="3.4" fill="#5e3518" fillOpacity=".7" />
          <circle cx="64" cy="0" r="3.4" fill="#5e3518" fillOpacity=".7" />
          <circle cx="0" cy="96" r="3.4" fill="#5e3518" fillOpacity=".7" />
          <circle cx="64" cy="96" r="3.4" fill="#5e3518" fillOpacity=".7" />
        </pattern>
      </defs>
      <rect
        x="-2000"
        y="-2000"
        width={W}
        height={H}
        fill="url(#lu-title-wall)"
      />
      <rect
        x="-2000"
        y="-2000"
        width={W}
        height={H}
        fill="#f2dfb8"
        fillOpacity=".06"
      />
    </svg>
  );
}

/**
 * What for?'s title scene: the tactics board in the coach's room, in Nutmeg's
 * mood: old diamond wallpaper, a team pennant and the board on its legs, its
 * raw orange-brown wood grained upright. "1st half" is written in chalk in the
 * middle of the board, underlined, chalk dust falling, and flies to the
 * corner; then the pitch, the players' magnets, the arrows and a "?" in the
 * goal. On a rematch the eraser wipes the number, the next is written over
 * it, the magnets move and last match's chalk stays on as a ghost.
 */
function LineupTitleScene({
  players,
  first,
  portrait,
  labels,
}: TitleProps & {
  labels: {
    /** The match number as written ("1", "1st"), and the one before (a rematch). */
    half: string;
    prevHalf: string;
    /** What follows it: "º tempo", " half". */
    rest: string;
    title: string;
    formation: string;
    or: string;
  };
}) {
  const t = lineupTimes(first);
  const board = BOARD[portrait ? "portrait" : "landscape"];
  const count = Math.min(players.length, board.next.length);
  const shown = players.slice(0, count);
  const arrows = links(board.next, board.goal, count);
  const ghost = first ? [] : links(board.last, board.goal, count);
  const { w, h } = portrait ? { w: 780, h: 1688 } : { w: 1280, h: 720 };
  const vb = `0 0 ${board.w} ${board.h}`;
  return (
    <div className={cn(s.screen, portrait && s.portrait)}>
      <Wall w={w} h={h} />
      <span className={s.aging} />
      <svg className={s.pennant} viewBox="-10 -56 104 256" aria-hidden="true">
        <path
          d="M-2 7L42 -48L86 7"
          fill="none"
          stroke="#3f2614"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="42" cy="-49" r="3.2" fill="#6b6f78" />
        <path d="M4 10H80L42 196Z" fill="#1E2433" />
        <path d="M4 10H80L74.5 37H9.5Z" fill="#cf7024" />
        <path d="M14.6 62H69.4L64.5 86H19.5Z" fill="#cf7024" />
        <path d="M24.4 110H59.6L54.7 134H29.3Z" fill="#cf7024" />
        <path
          d="M4 10H80L42 196Z"
          fill="none"
          stroke="#F6E3A1"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <rect x="-6" y="3" width="96" height="8" rx="4" fill="#a8622b" />
        <rect
          x="-6"
          y="3"
          width="96"
          height="3"
          rx="1.5"
          fill="#d08a4e"
          fillOpacity=".7"
        />
        <circle cx="-6" cy="7" r="5" fill="#7a4220" />
        <circle cx="90" cy="7" r="5" fill="#7a4220" />
      </svg>
      {board.legs.map((left) => (
        <span key={left} className={s.leg} style={{ left }} />
      ))}
      <div className={s.note}>
        <span className={s.noteTape} />
        <div className={s.paper}>
          <b>{labels.formation}</b>
          <span>{labels.or}</span>
        </div>
      </div>
      <Whistle />
      <span className={cn(s.frame, s.wood)} />
      {board.screws.map(([left, top]) => (
        <span
          key={`${left}-${top}`}
          className={s.screw}
          style={{ left, top }}
        />
      ))}
      <span className={s.tray} />
      <span
        className={s.chalkStick}
        style={{ left: board.sticks[0], width: 54, transform: "rotate(-4deg)" }}
      />
      <span
        className={s.chalkStick}
        style={{
          left: board.sticks[1],
          width: 38,
          transform: "rotate(3deg)",
          background: "#f6e3a1",
        }}
      />
      <span className={s.eraser} />
      <span className={s.lampedge} style={{ animationDelay: "0.28s" }} />
      <span className={s.lampdark} style={{ animationDelay: "0.12s" }} />
      <span className={s.fromwhite} style={{ animationDelay: "0s" }} />
      <div className={s.slate}>
        <svg
          className={s.erased}
          width={board.w}
          height={board.h}
          viewBox={vb}
          aria-hidden="true"
        >
          <defs>
            <filter
              id="lu-title-erased"
              x="-10%"
              y="-20%"
              width="120%"
              height="140%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.006 0.22"
                numOctaves="3"
                seed="7"
                result="streak"
              />
              <feColorMatrix
                in="streak"
                type="matrix"
                values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.45"
                result="grain"
              />
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="26"
                result="soft"
              />
              <feComposite in="grain" in2="soft" operator="in" result="marks" />
              <feGaussianBlur in="marks" stdDeviation="5.2 2.6" />
            </filter>
          </defs>
          <g
            filter="url(#lu-title-erased)"
            fill="none"
            stroke="#e8eee2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {board.erased.map(([d, width, opacity]) => (
              <path key={d} d={d} strokeWidth={width} strokeOpacity={opacity} />
            ))}
          </g>
        </svg>
        {first ? null : (
          <>
            <svg
              className={s.chalk}
              width={board.w}
              height={board.h}
              viewBox={vb}
              aria-hidden="true"
            >
              {board.smears.map((d) => (
                <path
                  key={d}
                  className={s.smear}
                  d={d}
                  style={{ animationDelay: sec(t.smear) }}
                />
              ))}
            </svg>
            <svg
              className={s.chalk}
              width={board.w}
              height={board.h}
              viewBox={vb}
              aria-hidden="true"
            >
              {ghost.map((d) => (
                <path
                  key={d}
                  className={s.ghostChalk}
                  pathLength={1}
                  d={d}
                  style={{ animationDelay: sec(t.ghost) }}
                />
              ))}
            </svg>
          </>
        )}
        <svg
          className={s.chalk}
          width={board.w}
          height={board.h}
          viewBox={vb}
          aria-hidden="true"
        >
          <defs>
            <filter
              id="lu-title-chalk"
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="1.1"
                numOctaves="2"
                result="n"
              />
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
            </filter>
          </defs>
          <g filter="url(#lu-title-chalk)">
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[0]}
              style={{
                animationDelay: sec(t.pitch),
                animationDuration: sec(t.pitchDur),
              }}
            />
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[1]}
              style={{
                animationDelay: sec(t.pitch2),
                animationDuration: sec(t.lineDur),
              }}
            />
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[2]}
              style={{
                animationDelay: sec(t.pitch2),
                animationDuration: sec(t.lineDur),
              }}
            />
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[3]}
              style={{
                animationDelay: sec(t.pitch3),
                animationDuration: sec(t.lineDur),
              }}
            />
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[4]}
              style={{
                animationDelay: sec(t.pitch3),
                animationDuration: sec(t.lineDur),
              }}
            />
            <path
              className={s.draw}
              pathLength={1}
              d={board.pitch[5]}
              style={{
                animationDelay: sec(t.pitch3),
                animationDuration: sec(t.lineDur),
              }}
            />
          </g>
        </svg>
        {/* the circle and the arrows each on their own, so drawing them doesn't redraw the pitch's chalk (the same noise, the same marks) */}
        <svg
          className={s.chalk}
          width={board.w}
          height={board.h}
          viewBox={vb}
          aria-hidden="true"
        >
          <path
            className={s.draw}
            pathLength={1}
            d={board.circle}
            filter="url(#lu-title-chalk)"
            style={{
              animationDelay: sec(t.circle),
              animationDuration: sec(t.circleDur),
            }}
          />
        </svg>
        <svg
          className={s.chalk}
          width={board.w}
          height={board.h}
          viewBox={vb}
          aria-hidden="true"
        >
          <g filter="url(#lu-title-chalk)">
            {arrows.map((d, i) => (
              <path
                key={d}
                className={s.draw}
                pathLength={1}
                d={d}
                style={{
                  animationDelay: sec(t.arrows + i * t.arrowStep),
                  animationDuration: sec(t.arrowDur),
                }}
              />
            ))}
          </g>
        </svg>
        <span
          className={cn(s.mystery, s.write)}
          style={{
            left: board.mystery.x,
            top: board.mystery.y,
            animationDelay: sec(t.mystery),
            animationDuration: sec(t.writeDur),
          }}
        >
          ?
        </span>
        {shown.map((p, i) => {
          const to = board.next[i];
          const from = board.last[i];
          const drop = t.drop + i * t.step;
          return (
            <div
              key={p.id}
              className={cn(s.mg, !first && s.move)}
              style={
                {
                  left: to.x - 40,
                  top: to.y - 40,
                  "--from-x": `${from.x - to.x}px`,
                  "--from-y": `${from.y - to.y}px`,
                  animationDelay: first ? undefined : sec(t.move + i * 0.05),
                } as CSSProperties
              }
            >
              <div
                className={s.mag}
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${litOf(p.slot)}, ${seatOf(p.slot)} 62%)`,
                  animationDelay: sec(drop),
                  animationDuration: sec(t.dropDur),
                }}
              >
                {first ? (
                  <span
                    className={s.mdust}
                    style={{ animationDelay: sec(drop + 0.3) }}
                  />
                ) : null}
                <span className={s.magHi} />
                <span className={s.av} style={{ background: p.avatar.color }}>
                  {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                  <img src={avatarSrc(p.avatar)} alt="" />
                </span>
              </div>
              {p.crowned && !first ? (
                // biome-ignore lint/performance/noImgElement: a small svg
                <img
                  className={s.kcrown}
                  src="/opening/crown.svg"
                  alt=""
                  style={{
                    width: 76,
                    left: -16,
                    top: -52,
                    animationDelay: sec(t.crown),
                  }}
                />
              ) : null}
              <span
                className={cn(s.mname, s.write)}
                style={{
                  fontSize: p.name.length > 10 ? 22 : 28,
                  animationDelay: sec(drop + t.nameLag),
                  animationDuration: sec(t.nameDur),
                }}
              >
                {p.name}
              </span>
            </div>
          );
        })}
        <h2
          className={cn(s.title, s.write)}
          style={{
            animationDelay: sec(t.title),
            animationDuration: sec(t.titleDur),
          }}
        >
          {labels.title}
        </h2>
        <div className={s.halfwrap} style={{ animationDelay: sec(t.fly) }}>
          <div className={s.halfbox}>
            <div className={s.htext}>
              <span className={s.hnum}>
                {first ? null : (
                  <>
                    <span
                      className={s.old}
                      style={{ animationDelay: sec(t.smudge) }}
                    >
                      {labels.prevHalf}
                    </span>
                    <span
                      className={s.rub}
                      style={{ animationDelay: sec(t.erase) }}
                    />
                  </>
                )}
                <span
                  className={s.write}
                  style={{
                    display: "inline-block",
                    animationDelay: sec(t.numW),
                    animationDuration: "0.3s",
                    animationTimingFunction: "steps(5)",
                  }}
                >
                  {labels.half}
                </span>
              </span>
              <span
                className={s.write}
                style={{
                  animationDelay: sec(t.restW),
                  animationDuration: sec(t.restDur),
                }}
              >
                {labels.rest}
              </span>
            </div>
            <svg className={s.uline} viewBox="0 0 440 34" aria-hidden="true">
              <path
                className={s.draw}
                pathLength={1}
                d="M18 12C120 4 300 6 424 14"
                style={{
                  animationDelay: sec(t.ul1),
                  animationDuration: sec(t.ulDur),
                }}
              />
              <path
                className={s.draw}
                pathLength={1}
                d="M40 27C150 20 290 22 400 28"
                style={{
                  animationDelay: sec(t.ul2),
                  animationDuration: sec(t.ulDur),
                }}
              />
            </svg>
            {first
              ? DUST.map(([x, y], i) => (
                  <span
                    key={`${x}-${y}`}
                    className={s.dust}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      animationDelay: sec(0.2 + i * 0.12),
                    }}
                  />
                ))
              : null}
          </div>
        </div>
      </div>
      <span className={s.vignette} />
      <svg
        className={s.grain}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
      >
        <filter id="lu-title-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.78"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" slope="3.2" intercept="-1.1" />
            <feFuncG type="linear" slope="3.2" intercept="-1.1" />
            <feFuncB type="linear" slope="3.2" intercept="-1.1" />
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>
        <rect width={w} height={h} filter="url(#lu-title-grain)" />
      </svg>
    </div>
  );
}

/** The referee's whistle hanging from its cord, swinging a little. */
function Whistle() {
  return (
    <svg className={s.whistle} viewBox="0 0 120 420" aria-hidden="true">
      <defs>
        <linearGradient id="lu-title-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5F7FB" />
          <stop offset=".3" stopColor="#D3D9E4" />
          <stop offset=".7" stopColor="#9AA4B6" />
          <stop offset="1" stopColor="#6E798C" />
        </linearGradient>
      </defs>
      <path
        d="M60 0C55 100 65 200 57 294"
        fill="none"
        stroke="#7a1f16"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M60 0C65 100 55 200 63 294"
        fill="none"
        stroke="#C2412F"
        strokeWidth="4.6"
        strokeLinecap="round"
      />
      <path
        d="M60 0C65 100 55 200 63 294"
        fill="none"
        stroke="#F28B76"
        strokeWidth="1.4"
        strokeDasharray="3 5"
        strokeLinecap="round"
      />
      <g transform="translate(60 300) rotate(-72) scale(1.15) translate(-86 -10)">
        <circle
          cx="86"
          cy="10"
          r="6.5"
          fill="none"
          stroke="#2C3445"
          strokeWidth="5"
        />
        <circle
          cx="86"
          cy="10"
          r="6.5"
          fill="none"
          stroke="#C9D1DF"
          strokeWidth="2.4"
        />
        <path
          d="M70 12L14 15A8 8 0 0 0 14 31L42.65 34A28 28 0 1 0 70 12Z"
          fill="url(#lu-title-metal)"
          stroke="#2C3445"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M44 12.6L50 22H64V12.4Z" fill="#1E2433" />
        <path
          d="M20 18.5H43"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeOpacity=".9"
        />
        <path
          d="M49.3 32.5A22 22 0 0 1 62.5 19.3"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity=".85"
        />
        <path
          d="M90.8 52A24 24 0 0 1 61.8 62.6"
          fill="none"
          stroke="#4d5668"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity=".45"
        />
      </g>
    </svg>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
export const LineupTitle = memo(LineupTitleScene);
