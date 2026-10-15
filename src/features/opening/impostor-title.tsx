"use client";

import { type CSSProperties, memo } from "react";
import { avatarEyesUri } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { blindsFor, lineupOf, motes, pad, Ruler, roomOf } from "./impostor-set";
import s from "./impostor-title.module.css";
import { CASTS, type SuitSize, suitGeo } from "./suits";
import { type FramePlay, Hole, Pose, SuspectFigure } from "./suspect";
import {
  type Bleed,
  litOf,
  seatOf,
  type TitlePlayer,
  type TitleProps,
} from "./title-kit";
import { impostorTimes, sec } from "./title-timing";

/** The pictures the scene paints with: the room (a window's way up), its sides, and the rest. */
export const impostorImages = (portrait: boolean) => [
  ...["", "-l", "-r"].map(
    (side) => `/opening/impostor-room${portrait ? "-tall" : ""}${side}.webp`,
  ),
  "/opening/smoke.webp",
  "/opening/case-wood.webp",
  "/opening/grain.webp",
  "/opening/glass-smudge.webp",
  "/opening/stamp-mask.webp",
];

/**
 * The Impostor's title scene: a noir police lineup. It opens on closed
 * blinds, only light leaking between the slats, the letter board's "CASE
 * NO. 01" in front. The slats turn, the blinds rise and the board flies to
 * the corner; behind, the painted wall with the height chart and four ceiling
 * lights. The suspects walk in, each in a little monster costume, their face
 * in a round hole and a card held up in their paws, its back out with their
 * number (the end turns it): everyone in disguise, one of
 * them the impostor. A flash, and the lights go off one by one, left to right,
 * leaving only the eyes, in each player's colour. On a rematch the blinds open
 * as the number changes, the lineup already behind them.
 */
function ImpostorTitleScene({
  players,
  n,
  first,
  portrait,
  bleed,
  labels,
}: TitleProps & {
  bleed: Bleed;
  labels: { case: string; title: string };
}) {
  const t = impostorTimes(first);
  const room = roomOf(portrait);
  // the window, in canvas pixels: the room, the blinds and the glass run to its edges
  const win = { w: room.w + 2 * bleed.x, h: room.h + 2 * bleed.y };
  const bl = blindsFor(portrait, win.w, win.h);
  const tiltStep = portrait ? 0.011 : t.tiltStep;
  const clackAt = (c: number) => t.dim + c * t.clack;
  const count = players.length;
  // upright: one row up to four, else two, the first half on a step at the back
  const { sz, oneRow, rowSize, spots } = lineupOf(portrait, count);
  const suspects = players.map((p, i) => ({ p, i, ...spots[i] }));
  const sl = room.slats;
  const v = (bl.from - bl.to) / t.raiseDur;
  const slats = Array.from({ length: bl.n }, (_, i) => {
    const y = sl.top + i * sl.pitch;
    const home = sl.top + i * sl.stack;
    const off = y - home;
    const pick = Math.max(0, (bl.from - (y + sl.h)) / v);
    return {
      y,
      // where it rests bunched up, from where it hangs (a whole pixel, as the layout put it)
      to: Math.round(home) - y,
      off,
      po: Math.round(bl.center - (y + sl.h / 2)),
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
        <Ruler portrait={portrait} className={s.ruler} />
        <div className={cn(s.win, s.dark)} />
        {room.lights.map((x, c) => (
          <div
            key={x}
            className={cn(s.win, s.shade, s[`sh${c}`])}
            style={{
              animationDelay:
                c < 3
                  ? `${sec(clackAt(c))}, ${sec(clackAt(c + 1) + 0.1)}`
                  : sec(clackAt(c)),
            }}
          />
        ))}
        <div
          className={cn(s.win, s.flick)}
          style={{ animationDelay: sec(t.flick) }}
        />
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
                  rowSize={rowSize}
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
          style={
            {
              left: -bleed.x,
              top: -bleed.y,
              width: win.w,
              height: win.h,
              "--dim": sec(clackAt(3)),
            } as CSSProperties
          }
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
          {bl.ladders.map((left) => (
            <span
              key={left}
              className={s.ladder}
              style={
                {
                  left,
                  height: bl.ladderH,
                  "--lh": `${bl.ladderEnd}px`,
                  animationDelay: sec(t.raise),
                  animationDuration: sec(t.raiseDur),
                } as CSSProperties
              }
            />
          ))}
          <div className={s.railHome} style={{ top: bl.to }}>
            <div
              className={s.rail}
              style={
                {
                  top: bl.from - bl.to,
                  "--to": `${bl.to - bl.from}px`,
                  animationDelay: sec(t.raise),
                  animationDuration: sec(t.raiseDur),
                } as CSSProperties
              }
            />
          </div>
          <span className={s.headrail} />
          <span
            className={s.cord}
            style={{
              left: bl.cord,
              animationDelay: `${sec(t.raise)}, 0s`,
              animationDuration: `${sec(t.raiseDur)}, 3.6s`,
            }}
          >
            <span className={s.tassel} />
          </span>
          <span className={s.bunchDim} style={{ height: bl.bunch }} />
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
        <div className={cn(s.win, s.frame)} />
        <div
          className={cn(s.win, s.glasswrap)}
          style={{ animationDelay: sec(clackAt(3)) }}
        >
          <div className={cn(s.layer, s.sheen)} />
          <div className={cn(s.layer, s.smudge)} />
          <div className={cn(s.layer, s.refl)} />
        </div>
        <div className={cn(s.win, s.vig)} />
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

/** One suspect: the costume walking in on its four frames (its face and card with it), and in the dark their eyes. */
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
  const glow = litOf(p.slot);
  const seat = seatOf(p.slot);
  const g = suitGeo(CASTS[i % CASTS.length], sz, rowSize, seat);
  // the 4 frames play while they walk in (2 cycles of 0.5 s) and stop on the first;
  // on a rematch they are already in place behind the blinds and shuffle as these rise
  const walk: FramePlay = {
    delay: first ? t.walk + i * t.step : t.raise + 0.3 - ((i * 3) % 4) * 0.125,
    dur: 0.5,
    count: first ? Math.max(1, Math.round(t.walkDur / 0.5)) : 2,
  };
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
        {/* the costume, its face and its card, going dark together (one filter, with its shadow) */}
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
          <SuspectFigure
            g={g}
            i={i}
            seat={seat}
            avatar={p.avatar}
            play={walk}
          />
        </div>
        {/* in the dark, only the eyes: in the face's hole, following the frames */}
        <Pose g={g} play={walk}>
          <Hole g={g}>
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
          </Hole>
        </Pose>
      </div>
    </div>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
export const ImpostorTitle = memo(ImpostorTitleScene);
