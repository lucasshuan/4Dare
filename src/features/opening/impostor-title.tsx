"use client";

import { type CSSProperties, memo } from "react";
import { avatarEyesUri } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import s from "./impostor-title.module.css";
import { CASTS, type SuitSize, suitGeo } from "./suits";
import {
  avatarSrc,
  litOf,
  mix,
  rnd,
  seatOf,
  type TitlePlayer,
  type TitleProps,
} from "./title-kit";
import type { TitleCue } from "./title-sound";
import { impostorTimes, sec } from "./title-timing";

export const IMPOSTOR_SOUNDS = [
  "/opening/impostor-in.mp3",
  "/opening/impostor-first.mp3",
  "/opening/impostor-again.mp3",
];
export const IMPOSTOR_IMAGES = [
  "/opening/impostor-room.webp",
  "/opening/impostor-room-tall.webp",
  "/opening/smoke.webp",
  "/opening/case-wood.webp",
  "/opening/grain.webp",
  "/opening/glass-smudge.webp",
  "/opening/stamp-mask.webp",
];

/**
 * The sounds: the white light's hum burning out on the way in, then one mixed
 * track (the letter board's keys, the lights' hum, the blinds turning and
 * rising, each costume's steps, the flash, every light going off, the stamp).
 */
export function impostorCues(first: boolean): TitleCue[] {
  return [
    {
      src: first
        ? "/opening/impostor-first.mp3"
        : "/opening/impostor-again.mp3",
      at: 0,
      gain: 1,
      track: true,
    },
    { src: "/opening/impostor-in.mp3", at: 0, gain: 0.5 },
  ];
}

/** Each canvas's room: where its four ceiling lights hang (one per column they put out), the blinds' slats. */
const ROOM = {
  landscape: {
    lights: [160, 480, 800, 1120],
    colW: 320,
    mid: 640,
    ladders: [318, 960],
    slats: {
      n: 16,
      pitch: 44,
      top: 18,
      h: 43,
      stack: 2.6,
      from: 722,
      to: 64,
      center: 360,
    },
  },
  portrait: {
    lights: [97, 292, 487, 682],
    colW: 195,
    mid: 390,
    ladders: [190, 590],
    slats: {
      n: 26,
      pitch: 66,
      top: 18,
      h: 64,
      stack: 3.6,
      from: 1734,
      to: 118,
      center: 844,
    },
  },
} as const;

/** The dust in each light's beam: nine motes each, the same everywhere. */
function motes(portrait: boolean) {
  return ROOM[portrait ? "portrait" : "landscape"].lights.map((_, b) =>
    Array.from({ length: 9 }, (_, j) => {
      const a = rnd(b * 31 + j * 7 + 1);
      const x = rnd(b * 17 + j * 13 + 2);
      const sz = rnd(b * 5 + j * 29 + 3);
      const d = rnd(b * 41 + j * 3 + 4);
      const o = rnd(b * 11 + j * 19 + 5);
      const y = portrait ? 40 + a * 640 : 50 + a * 430;
      const half = portrait ? 20 + y * 0.22 : 24 + y * 0.34;
      const big = d > 0.78;
      const dur = 7 + d * 7;
      return {
        k: ["m1", "m2", "m3"][j % 3],
        big,
        x: Math.round((portrait ? 200 : 260) + (x * 2 - 1) * half * 0.85),
        y: Math.round(y),
        s: big ? 4.5 : 1.4 + sz * 1.8,
        dur,
        delay: -(o * dur),
      };
    }),
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The Impostor's title scene: a noir police lineup. It opens on closed
 * blinds, only light leaking between the slats, the letter board's "CASE
 * NO. 01" in front. The slats turn, the blinds rise and the board flies to
 * the corner; behind, the painted wall with the height chart and four ceiling
 * lights. The suspects walk in, each in a little monster costume, their face
 * in a round hole and the placard in their paws: everyone in disguise, one of
 * them the impostor. A flash, and the lights go off one by one, left to right,
 * leaving only the eyes, in each player's colour. On a rematch the blinds open
 * as the number changes, the lineup already behind them.
 */
function ImpostorTitleScene({
  players,
  n,
  first,
  portrait,
  labels,
}: TitleProps & { labels: { case: string; title: string } }) {
  const t = impostorTimes(first);
  const room = ROOM[portrait ? "portrait" : "landscape"];
  const tiltStep = portrait ? 0.011 : t.tiltStep;
  const clackAt = (c: number) => t.dim + c * t.clack;
  const count = players.length;
  // upright: one row up to four, else two, the first half on a step at the back
  const oneRow = !portrait || count <= 4;
  const perRow = oneRow ? count : Math.ceil(count / 2);
  const sz: SuitSize = portrait
    ? perRow <= 3
      ? { w: 220, gap: 24, av: 120, pw: 132, ph: 76, pfs: 33 }
      : perRow <= 4
        ? { w: 170, gap: 14, av: 104, pw: 118, ph: 70, pfs: 30 }
        : { w: 140, gap: 6, av: 92, pw: 106, ph: 64, pfs: 27 }
    : count <= 4
      ? { w: 210, gap: 34, av: 116, pw: 128, ph: 74, pfs: 32 }
      : count <= 6
        ? { w: 170, gap: 18, av: 104, pw: 118, ph: 70, pfs: 30 }
        : count <= 8
          ? { w: 138, gap: 10, av: 88, pw: 104, ph: 64, pfs: 26 }
          : { w: 112, gap: 8, av: 84, pw: 92, ph: 56, pfs: 22 };
  const suspects = players.map((p, i) => {
    const row = oneRow || i < perRow ? 0 : 1;
    const j = row ? i - perRow : i;
    const inRow = row ? count - perRow : perRow;
    const cx = room.mid + (j - (inRow - 1) / 2) * (sz.w + sz.gap);
    const col = Math.max(0, Math.min(3, Math.floor(cx / room.colW)));
    const near = room.lights.reduce((a, b) =>
      Math.abs(b - cx) < Math.abs(a - cx) ? b : a,
    );
    return {
      p,
      i,
      row,
      col,
      dx: Math.round(Math.max(-24, Math.min(24, (cx - near) * 0.16)) + 6),
    };
  });
  const sl = room.slats;
  const v = (sl.from - sl.to) / t.raiseDur;
  const slats = Array.from({ length: sl.n }, (_, i) => {
    const y = sl.top + i * sl.pitch;
    const home = sl.top + i * sl.stack;
    const off = y - home;
    const pick = Math.max(0, (sl.from - (y + sl.h)) / v);
    return {
      y,
      // where it rests bunched up, from where it hangs (a whole pixel, as the layout put it)
      to: Math.round(home) - y,
      off,
      po: Math.round(sl.center - (y + sl.h / 2)),
      rd: t.raise + pick,
      rdur: Math.max(0.01, off / v),
      td: t.tilt + i * tiltStep,
    };
  });
  const dust = motes(portrait);
  const cur = pad(n);
  const prev = pad(Math.max(0, n - 1));
  return (
    <div className={cn(s.root, portrait && s.portrait)}>
      <div className={s.screen}>
        <div className={s.plate} />
        {room.lights.map((x, c) => (
          <div
            key={x}
            className={cn(s.shade, s[`sh${c}`])}
            style={{
              animationDelay:
                c < 3
                  ? `${sec(clackAt(c))}, ${sec(clackAt(c + 1) + 0.1)}`
                  : sec(clackAt(c)),
            }}
          />
        ))}
        <div className={s.flick} style={{ animationDelay: sec(t.flick) }} />
        {room.lights.map((x, b) => (
          <div
            key={x}
            className={cn(s.beamwrap, b === 3 && s.fl)}
            style={{ left: x, animationDelay: sec(clackAt(b)) }}
          >
            <span className={s.cone} style={{ animationDelay: sec(t.flick) }} />
            <span className={s.smoke}>
              <span
                className={s.smokeTex}
                style={{ animationDelay: `${-(b * 7.3)}s` }}
              />
            </span>
            {dust[b].map((m) => (
              <i
                key={`${m.x}-${m.y}`}
                className={cn(s.mote, s[m.k], m.big && s.moteB)}
                style={{
                  left: m.x,
                  top: m.y,
                  width: m.s,
                  height: m.s,
                  animationDuration: `${m.dur.toFixed(2)}s`,
                  animationDelay: `${m.delay.toFixed(2)}s`,
                }}
              />
            ))}
            {portrait ? <span className={s.beamVeil} /> : null}
          </div>
        ))}
        {[0, 1].map((row) => {
          const list = suspects.filter((x) => x.row === row);
          if (!list.length) return null;
          return (
            <div
              key={row}
              className={cn(s.lineup, portrait && (row ? s.front : s.back))}
              style={{
                gap: sz.gap,
                bottom:
                  portrait && row === 0 ? (oneRow ? 210 : 376) : undefined,
              }}
            >
              {list.map((x) => (
                <Suspect
                  key={x.p.id}
                  p={x.p}
                  i={x.i}
                  sz={sz}
                  rowSize={portrait ? perRow : count}
                  dx={x.dx}
                  dim={clackAt(x.col)}
                  t={t}
                  first={first}
                />
              ))}
            </div>
          );
        })}
        <div
          className={s.blinds}
          style={{ "--dim": sec(clackAt(3)) } as CSSProperties}
        >
          {slats.map((x) => (
            <div key={x.y} className={s.slHome} style={{ top: x.y }}>
              <div
                className={s.slMv}
                style={
                  {
                    "--to": `${x.to}px`,
                    perspectiveOrigin: `50% ${x.po}px`,
                    animationDelay: sec(x.rd),
                    animationDuration: sec(x.rdur),
                  } as CSSProperties
                }
              >
                <div
                  className={s.slat}
                  style={{
                    animationDelay: `${sec(x.td)}, ${sec(x.rd)}`,
                    animationDuration: `${sec(t.tiltDur)}, ${sec(t.flatDur)}`,
                  }}
                >
                  <span
                    className={s.leak}
                    style={{
                      animationDelay: `${sec(t.leakOn)}, ${sec(x.td)}`,
                      animationDuration: `${sec(t.leakDur)}, 0.25s`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          {room.ladders.map((left) => (
            <span
              key={left}
              className={s.ladder}
              style={{
                left,
                animationDelay: sec(t.raise),
                animationDuration: sec(t.raiseDur),
              }}
            />
          ))}
          <div className={s.railHome}>
            <div
              className={s.rail}
              style={{
                animationDelay: sec(t.raise),
                animationDuration: sec(t.raiseDur),
              }}
            />
          </div>
          <span className={s.headrail} />
          <span
            className={s.cord}
            style={{
              animationDelay: `${sec(t.raise)}, 0s`,
              animationDuration: `${sec(t.raiseDur)}, 3.6s`,
            }}
          >
            <span className={s.tassel} />
          </span>
          <span className={s.bunchDim} />
        </div>
        <div className={cn(s.layer, s.center)}>
          <div
            className={s.caseboard}
            style={{
              animationDelay: `${sec(t.boardIn)}, ${sec(t.fly)}`,
              animationDuration: `${sec(t.boardDur)}, 0.62s`,
            }}
          >
            <span className={s.screw} style={{ left: 3, top: 3 }} />
            <span className={s.screw} style={{ right: 3, top: 3 }} />
            <span className={s.screw} style={{ left: 3, bottom: 3 }} />
            <span className={s.screw} style={{ right: 3, bottom: 3 }} />
            <div className={s.felt}>
              <div className={s.row}>
                {[...labels.case].map((ch, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: the word's letters, in place
                    key={i}
                    className={cn(s.lt, s.small)}
                    style={{
                      animationDelay: sec(t.letters + i * t.letterStep),
                    }}
                  >
                    {ch}
                  </span>
                ))}
              </div>
              <div className={s.row}>
                <Digit
                  cur={cur[0]}
                  prev={first ? null : prev[0]}
                  inAt={t.digits}
                  swap={t.swap}
                  out={t.out}
                />
                <Digit
                  cur={cur.slice(1)}
                  prev={first ? null : prev.slice(1)}
                  inAt={t.digits + t.digitStep}
                  swap={t.swap}
                  out={t.out}
                />
              </div>
            </div>
            <span
              className={s.boardDim}
              style={{ animationDelay: sec(clackAt(0)) }}
            />
          </div>
        </div>
        <div className={cn(s.layer, s.frame)} />
        <div
          className={cn(s.layer, s.glasswrap)}
          style={{ animationDelay: sec(clackAt(3)) }}
        >
          <div className={cn(s.layer, s.sheen)} />
          <div className={cn(s.layer, s.smudge)} />
          <div className={cn(s.layer, s.refl)} />
        </div>
        <div className={cn(s.layer, s.vig)} />
        <div className={s.stamps}>
          <span className={s.stamp} style={{ animationDelay: sec(t.stamp) }}>
            {labels.title}
          </span>
        </div>
        <span className={s.grain} />
      </div>
      {t.flashes.map((d) => (
        <div key={d} className={s.flash} style={{ animationDelay: sec(d) }} />
      ))}
      <span className={s.powercut} />
    </div>
  );
}

/** A digit of the case number: pressed in, or on a rematch swapped for the next (the old one pops off). */
function Digit({
  cur,
  prev,
  inAt,
  swap,
  out,
}: {
  cur: string;
  /** The number before (a rematch); null on the first case. */
  prev: string | null;
  inAt: number;
  swap: number;
  out: number;
}) {
  if (prev === null || prev === cur)
    return (
      <span
        className={cn(s.lt, s.big)}
        style={{ animationDelay: sec(prev === null ? inAt : 0) }}
      >
        {cur}
      </span>
    );
  return (
    <span className={s.dslot}>
      <span
        className={cn(s.lt, s.big, s.out)}
        style={{ animationDelay: `0s, ${sec(out)}` }}
      >
        {prev}
      </span>
      <span className={cn(s.lt, s.big)} style={{ animationDelay: sec(swap) }}>
        {cur}
      </span>
    </span>
  );
}

/** One suspect: the costume walking in on its four frames, the face in the hole, the placard, and in the dark their eyes. */
function Suspect({
  p,
  i,
  sz,
  rowSize,
  dx,
  dim,
  t,
  first,
}: {
  p: TitlePlayer;
  i: number;
  sz: SuitSize;
  rowSize: number;
  dx: number;
  dim: number;
  t: ReturnType<typeof impostorTimes>;
  first: boolean;
}) {
  const seat = seatOf(p.slot);
  const glow = litOf(p.slot);
  const g = suitGeo(CASTS[i % CASTS.length], sz, rowSize, seat);
  // the 4 frames play while they walk in (2 cycles of 0.5 s) and stop on the first;
  // on a rematch they are already in place behind the blinds and shuffle as these rise
  const cycles = first ? Math.max(1, Math.round(t.walkDur / 0.5)) : 2;
  const fd = first
    ? t.walk + i * t.step
    : t.raise + 0.3 - ((i * 3) % 4) * 0.125;
  const nfs = Math.max(
    8,
    Math.min(
      Math.round(sz.pfs * 0.48),
      Math.floor((g.pw * 0.9) / (p.name.length * 0.58)),
    ),
  );
  const pawC = mix(seat, "#FFFFFF", 0.12);
  const frames = {
    "--t0": g.frames[0].css,
    "--t1": g.frames[1].css,
    "--t2": g.frames[2].css,
    "--t3": g.frames[3].css,
    transformOrigin: g.org,
    animationDelay: sec(fd),
    animationIterationCount: cycles,
  } as CSSProperties;
  return (
    <div className={s.slot} style={{ width: sz.w }}>
      <div
        className={s.walk}
        style={{
          animationDelay: sec(t.walk + i * t.step),
          animationDuration: sec(t.walkDur),
        }}
      >
        <span
          className={s.foot}
          style={{ width: g.footW, marginLeft: g.footML }}
        />
        {/* the costume, its face and its placard, going dark together (one filter, with its shadow) */}
        <div
          className={s.bob}
          style={
            {
              width: g.fw,
              height: g.fh,
              "--dx": `${dx}px`,
              animationDelay: `0s, ${sec(dim)}`,
            } as CSSProperties
          }
        >
          <div className={s.suit}>
            {g.frames.map((fr, k) => (
              <svg
                // biome-ignore lint/suspicious/noArrayIndexKey: the four frames, in order
                key={k}
                className={cn(s.frm, s[`f${k}`])}
                style={{
                  animationDelay: sec(fd),
                  animationIterationCount: cycles,
                }}
                width={g.fw}
                height={g.fh}
                viewBox={g.vb}
                aria-hidden="true"
              >
                <path
                  d={fr.legS}
                  fill="none"
                  stroke="#1E2433"
                  strokeWidth={fr.legSO}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={fr.legS}
                  fill="none"
                  stroke={g.legC}
                  strokeWidth={fr.legSW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={fr.legF}
                  fill="#1E2433"
                  stroke="#1E2433"
                  strokeWidth={g.ow}
                  strokeLinejoin="round"
                />
                <path d={fr.legF} fill={g.legFC} />
                <g transform={fr.tr}>
                  <path
                    d={g.back}
                    fill="#1E2433"
                    stroke="#1E2433"
                    strokeWidth={g.ow}
                    strokeLinejoin="round"
                  />
                  <path d={g.back} fill={g.backC} />
                  <path d={g.inner} fill={g.innerC} />
                  <path
                    d={fr.body}
                    fill="#1E2433"
                    stroke="#1E2433"
                    strokeWidth={g.ow}
                    strokeLinejoin="round"
                  />
                  <path
                    d={g.tuft}
                    fill="#1E2433"
                    stroke="#1E2433"
                    strokeWidth={g.ow}
                    strokeLinejoin="round"
                  />
                  <path
                    d={g.stalk}
                    fill="none"
                    stroke="#1E2433"
                    strokeWidth={g.stO}
                    strokeLinecap="round"
                  />
                  <path d={fr.body} fill={seat} />
                  <path d={g.tuft} fill={seat} />
                  <path
                    d={g.stalk}
                    fill="none"
                    stroke={seat}
                    strokeWidth={g.stW}
                    strokeLinecap="round"
                  />
                  <path
                    d={g.hl}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeOpacity=".45"
                    strokeWidth={g.hlW}
                    strokeLinecap="round"
                  />
                </g>
              </svg>
            ))}
          </div>
          <div className={s.frh} style={frames}>
            <span
              className={s.av}
              style={{ left: g.ax, top: g.ay, width: g.avs, height: g.avs }}
            >
              <span className={s.face} style={{ background: p.avatar.color }}>
                {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                <img src={avatarSrc(p.avatar)} alt="" />
              </span>
            </span>
            <div
              className={s.held}
              style={{
                left: g.bl,
                top: g.bt,
                width: g.pw,
                height: sz.ph,
                transform: `rotate(${((rnd(i * 7 + 3) * 2 - 1) * 1.8).toFixed(2)}deg)`,
              }}
            >
              <div className={s.placard}>
                <span className={s.pnum} style={{ fontSize: sz.pfs }}>
                  {pad(i + 1)}
                </span>
                <span className={s.pname} style={{ fontSize: nfs }}>
                  {p.name}
                </span>
              </div>
              <span
                className={s.paw}
                style={{
                  left: g.pl,
                  top: g.pt,
                  width: g.pd,
                  height: g.pd,
                  backgroundColor: pawC,
                }}
              />
              <span
                className={s.paw}
                style={{
                  left: g.pr,
                  top: g.pt,
                  width: g.pd,
                  height: g.pd,
                  backgroundColor: pawC,
                }}
              />
            </div>
          </div>
        </div>
        {/* in the dark, only the eyes: in the face's hole, following the frames */}
        <div className={s.frh} style={frames}>
          <span
            className={s.av}
            style={{ left: g.ax, top: g.ay, width: g.avs, height: g.avs }}
          >
            <span
              className={s.eyes}
              style={{ animationDelay: sec(dim + t.eyesLag) }}
            >
              {/* biome-ignore lint/performance/noImgElement: generated svg */}
              <img
                src={avatarEyesUri(p.avatar, glow)}
                alt=""
                style={{
                  filter: `drop-shadow(0 0 2px ${glow}) drop-shadow(0 0 8px ${glow})`,
                  animationDelay: `${-(i * 0.83)}s`,
                }}
              />
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
export const ImpostorTitle = memo(ImpostorTitleScene);
