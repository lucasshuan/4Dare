"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  memo,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { FrameSeal } from "@/components/ui/card-frame";
import { logoFile } from "@/components/ui/logo";
import { useRoomContext } from "@/features/data/room-context";
import {
  avatarSrc,
  inkOf,
  litOf,
  rnd,
  seatOf,
} from "@/features/opening/title-kit";
import { sec } from "@/features/opening/title-timing";
import type { Avatar, CardView } from "@/game/types";
import { cn } from "@/lib/cn";
import { END_ACTS, END_BEAT, type EndProps } from "./end-kit";
import s from "./who-end.module.css";

/** The k-th beat from the stage opening, 3 s into the scene: everything after it falls on the beat. */
const b = (k: number) => 3 + k * END_BEAT;

/** When each thing happens, in seconds from the scene's start. */
const T = {
  /** "Match N" leaves the corner and comes to the middle, where it turns into the rounds and counts them. */
  chipOut: 0.12,
  numIn: 0.1,
  count: 0.78,
  numOut: 2.35,
  chipIn: 2.9,
  /** The stage opens in a circle on b(0). */
  reveal: b(0) - 0.1,
  /** The plinths rise, then the cards drop on them face down, from the last place up. */
  rise: b(1),
  drop: b(2) + 0.08,
  step: END_BEAT / 4,
  /** The cards turn over from the last place up; whoever found theirs first on b(6). */
  flips: b(4),
  winFlip: b(6) - 0.32,
  win: b(6),
  crown: b(6) + 0.1,
  /** The title hits at 55% of its slam (0.33 s), on b(6) and a half. */
  titleLand: b(6) + 0.3,
  /** The scene makes room just before the reward card comes in. */
  make: END_ACTS["who-am-i"].card - 0.25,
};

/** The pixel sparks of a card turning over: [x, y] (px). */
const SPARKS = [
  [-62, -40],
  [-74, 6],
  [-34, -70],
  [62, -40],
  [74, 6],
  [34, -70],
  [0, -84],
  [-50, 44],
  [50, 44],
] as const;
const SPARK_C = [
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
];
/** The winner's pixel confetti. */
const CONFETTI_C = [
  "#F6E3A1",
  "#FFFFFF",
  "#2b69c8",
  "#cf7024",
  "#c03d8a",
  "#0b7a75",
  "#8a4fc4",
  "#F6E3A1",
];
const CONFETTI = Array.from({ length: 28 }, (_, c) => {
  const a = (c / 28) * Math.PI * 2;
  const r = 100 + rnd(c * 3 + 1) * 130;
  const dx = Math.round(Math.cos(a) * r);
  const dy = Math.round(Math.sin(a) * r * 0.8 - 110);
  return {
    k: c,
    c: CONFETTI_C[c % CONFETTI_C.length],
    dx,
    dy,
    ex: Math.round(dx * 1.25),
    ey: Math.round(dy + 420 + rnd(c * 7) * 140),
    d: T.titleLand + rnd(c * 5) * 0.12,
  };
});
/** The plinths' heights by place, as the room's podium has them; 36 past the third, 18 for who didn't find it. */
const PLINTH: Record<number, number> = { 1: 112, 2: 80, 3: 52 };
/** The light pastels behind a character's picture (what a wide or missing one shows). */
const PIC_BG = [
  "#F6E3A1",
  "#CDBFF6",
  "#F7C9D9",
  "#F3D3B8",
  "#BFE3EA",
  "#C8EFC9",
];
/** The "?" drifting over the blue stage: [left %, top %, size px, duration s, delay s]. */
const GLYPHS = [
  [5, 20, 44, 9, 0],
  [12, 76, 30, 8, -1.3],
  [30, 9, 24, 10, -2.6],
  [47, 86, 36, 9.5, -3.9],
  [66, 13, 28, 8.5, -5.2],
  [82, 58, 50, 10.5, -6.5],
  [93, 30, 24, 7.5, -7.8],
] as const;
/** The big "?" on the opened stage: [left %, top %, size px, turn deg]. */
const BIG_Q = [
  [3, 30, 280, -12],
  [87, 4, 180, 10],
  [80, 40, 300, 8],
] as const;
/** The trophy on the winner's plinth (24×24, stroked). */
const TROPHY = [
  "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
  "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
  "M4 22h16",
  "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
  "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
  "M18 2H6v7a6 6 0 0 0 12 0V2Z",
];
/** The "?" marks behind a picture, in the portrait's own units (80×100). */
const MARKS_ID = "who-end-marks";

/** The text on a seat's colour, as the light theme sets it: dark on the orange and the gold, white on the rest. */
function onOf(slot: number) {
  const c = seatOf(slot);
  return c === "#cf7024" ? "#2a1707" : c === "#b38600" ? "#2a1f00" : "#ffffff";
}

/** A player on the podium. */
interface EndPlayer {
  id: string;
  /** As the viewer reads it. */
  name: string;
  you: boolean;
  avatar: Avatar;
  slot: number;
  card: CardView | null;
  /** Who picked their character, as the viewer reads it; null when unknown. */
  picker: string | null;
  pickerYou: boolean;
  place: number | null;
  /** The round they found theirs. */
  found: number | null;
  gaveUp: boolean;
}

/** What the scene draws from the room: the podium, best place first. */
interface WhoEndData {
  players: EndPlayer[];
  /** The match's number, the chip the scene starts from. */
  match: number;
  /** How many rounds it had: what the number counts to. */
  rounds: number;
}

/** Its texts, in the viewer's language; per player in the podium's order. */
interface WhoEndLabels {
  match: string;
  rounds: string;
  title: string;
  who: string;
  by: string[];
  status: ReactNode[];
  place: string[];
}

/** One row of the podium: its cards' width, the gap, where its floor is, and who stands on it (indexes in the ranking). */
interface Row {
  w: number;
  gap: number;
  base: number;
  cols: number[];
}

/** Whoever ranks first stands in the middle and the others take turns on each side, going down. */
function podium(ids: number[]) {
  const cols = ids.slice(0, 1);
  for (let k = 1; k < ids.length; k++) {
    if (ids.length < 3) cols.push(ids[k]);
    else if (k % 2) cols.unshift(ids[k]);
    else cols.push(ids[k]);
  }
  return cols;
}

/** About how wide a line of the display font is, in ems: a wide (CJK) character is a whole one. */
const ems = (text: string) =>
  [...text].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? 1 : 0.54), 0);

const range = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

/**
 * Where everything stands. On a landscape stage one row on the floor, and the
 * whole thing slides right and shrinks onto the floor to make room for the
 * reward card. Upright, the top three on the floor and, with four or more, the
 * others on a step behind them; making room, it all goes up into the top part
 * of the screen, the floor and the step with it.
 */
function layout(n: number, portrait: boolean) {
  if (!portrait) {
    const sz =
      n >= 6
        ? { w: 170, gap: 18 }
        : n === 5
          ? { w: 180, gap: 24 }
          : n === 4
            ? { w: 188, gap: 28 }
            : { w: 192, gap: 36 };
    const rowW = Math.max(1, n * sz.w + (n - 1) * sz.gap);
    const rows: Row[] = [{ ...sz, base: 650, cols: podium(range(0, n)) }];
    return {
      cw: 1280,
      rows,
      floor: 650,
      riser: null as number | null,
      ms: Math.min(0.8, 860 / rowW),
      my: 0,
      fy: 0,
      ry: 0,
    };
  }
  const rows: Row[] =
    n <= 3
      ? [
          {
            w: n === 1 ? 300 : n === 2 ? 270 : 228,
            gap: n === 2 ? 40 : 20,
            base: 1180,
            cols: podium(range(0, n)),
          },
        ]
      : [
          { w: 196, gap: 22, base: 930, cols: podium(range(3, n)) },
          { w: 228, gap: 20, base: 1490, cols: podium(range(0, 3)) },
        ];
  const floor = rows[rows.length - 1].base;
  const riser = rows.length > 1 ? rows[0].base : null;
  // from the title's top (140) to the floor, into 120…890, above the room's panels
  const ms = Math.min(1, 770 / (floor + 20 - 140));
  const my = 120 - 140 * ms;
  return {
    cw: 780,
    rows,
    floor,
    riser,
    ms,
    my,
    fy: floor * ms + my - floor,
    ry: riser === null ? 0 : riser * ms + my - riser,
  };
}

/** A card's measures, from its width (what is a picture's measure follows the width). */
function cardSize(w: number, portrait: boolean) {
  const pw = w - 36;
  return {
    hfs: portrait ? Math.round(w * 0.085) : w < 180 ? 14 : 15,
    nfs: Math.round(w * 0.125),
    tfs: Math.min(Math.round(w * 0.125), Math.floor((w - 52) / 6.9)),
    disc: Math.round(pw * 0.4),
    dfs: Math.round(pw * 0.27),
    logo: Math.round(pw * 0.065),
    lmt: Math.round(pw * 0.07),
    lpx: Math.round(pw * 0.05),
    lpy: Math.round(pw * 0.024),
    pat: Math.round(w * 0.26),
    crW: Math.round(w * 0.44),
    crL: -Math.round(w * 0.16),
    crT: -Math.round(w * 0.22),
  };
}

/**
 * Who am I?'s end, on the game-show stage of its opening: the "Match N" chip
 * comes to the middle and its number counts the match's rounds, the stage
 * opens in a circle, the podium rises from the floor, the cards drop on it
 * face down and turn over from the last place up, and whoever found theirs
 * first gets the gold ring, the crown, the spotlight and the confetti, as the
 * title slams on the beat. Then it makes room for the reward card.
 */
function WhoEndView({
  data,
  labels,
  portrait,
  logo,
}: {
  data: WhoEndData;
  labels: WhoEndLabels;
  portrait: boolean;
  logo: string;
}) {
  const players = data.players;
  const n = players.length;
  const L = layout(n, portrait);
  const winners = players.filter((p) => p.place === 1).length;
  // the plinths and their figures a little bigger upright, read on a phone
  const up = portrait ? 1.25 : 1;
  // the count: from the match's number to its rounds, one step at a time
  const count = data.rounds >= 1 ? range(1, data.rounds + 1) : [0];
  const digits = count[0] === data.match ? count : [data.match, ...count];
  const dh = portrait ? 320 : 250;
  const tie = winners > 1;
  const tfs = portrait
    ? tie
      ? 52
      : 72
    : // on one line: smaller when a long name would run off the stage
      Math.min(tie ? 40 : 60, Math.floor(1180 / ems(labels.title)));
  const beams: { x: number; h: number }[] = [];
  for (const row of L.rows) {
    const rowW = row.cols.length * row.w + (row.cols.length - 1) * row.gap;
    const x0 = L.cw / 2 - rowW / 2;
    row.cols.forEach((i, j) => {
      if (players[i].place === 1)
        beams.push({
          x: Math.round(x0 + j * (row.w + row.gap) + row.w / 2),
          h: row.base + 70,
        });
    });
  }
  return (
    <div
      className={cn(s.screen, portrait && s.portrait)}
      style={
        {
          "--ms": L.ms.toFixed(3),
          "--my": `${L.my.toFixed(1)}px`,
          "--fy": `${L.fy.toFixed(1)}px`,
          "--ry": `${L.ry.toFixed(1)}px`,
          "--floor": `${L.floor}px`,
        } as CSSProperties
      }
    >
      <svg width="0" height="0" className={s.defs} aria-hidden="true">
        <defs>
          <pattern
            id={MARKS_ID}
            width="30"
            height="30"
            patternUnits="userSpaceOnUse"
          >
            <g transform="scale(0.4167)">
              <g
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.5"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 13.5a6.5 6.5 0 1 1 8.6 6.1c-1.6.6-2.3 1.7-2.3 3.4v1.6" />
                <path
                  d="M45.5 46a5 5 0 1 1 6.6 4.7c-1.2.5-1.8 1.3-1.8 2.6v1.2"
                  transform="rotate(14 50 50)"
                />
              </g>
              <g fill="#ffffff" fillOpacity="0.5">
                <circle cx="15.3" cy="30.6" r="2.3" />
                <circle cx="51.4" cy="60.6" r="1.8" />
              </g>
            </g>
          </pattern>
        </defs>
      </svg>
      <div className={s.bleed} />
      <div className={cn(s.layer, s.glow)} />
      <div className={s.layer}>
        {GLYPHS.map(([x, y, size, d, delay]) => (
          <span
            key={`${x}-${y}`}
            className={s.glyph}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: size,
              animationDuration: `${d}s`,
              animationDelay: `${delay}s`,
            }}
          >
            ?
          </span>
        ))}
      </div>
      <div
        className={cn(s.layer, s.reveal)}
        style={{ animationDelay: sec(T.reveal) }}
      >
        <span
          className={s.rays}
          style={{ animationDelay: `0s, ${sec(T.reveal)}` }}
        />
        {BIG_Q.map(([x, y, size, turn]) => (
          <span
            key={`${x}-${y}`}
            className={s.rq}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              fontSize: size,
              transform: `rotate(${turn}deg)`,
            }}
          >
            ?
          </span>
        ))}
        {L.riser !== null ? (
          <span
            className={s.riser}
            style={{
              top: L.riser,
              height: L.floor - L.riser,
              animationDelay: sec(T.make),
            }}
          />
        ) : null}
        <span className={s.floor} style={{ animationDelay: sec(T.make) }} />
      </div>
      <span className={s.iris} style={{ animationDelay: sec(T.reveal) }} />
      <div
        className={cn(s.chip, s.chipA)}
        style={{ animationDelay: sec(T.chipOut) }}
      >
        <span className={s.chipLabel}>{labels.match}</span>
        <span className={s.chipNum}>{data.match}</span>
      </div>
      <div
        className={cn(s.chip, s.chipB)}
        style={{ animationDelay: sec(T.chipIn) }}
      >
        <span className={s.chipNum}>{data.rounds}</span>
        <span className={s.chipLabel}>{labels.rounds}</span>
      </div>
      <div className={cn(s.layer, s.center)}>
        <div
          className={s.num}
          style={{ animationDelay: `${sec(T.numIn)}, ${sec(T.numOut)}` }}
        >
          <span className={s.numLabel}>
            <span
              className={cn(s.g, s.lA)}
              style={{ animationDelay: sec(T.count) }}
            >
              {labels.match}
            </span>
            <span
              className={cn(s.g, s.lB)}
              style={{ animationDelay: sec(T.count) }}
            >
              {labels.rounds}
            </span>
          </span>
          <span className={s.digitWin}>
            <span
              className={s.digitCol}
              style={
                {
                  "--y": `${-(digits.length - 1) * dh}px`,
                  animationDelay: sec(T.count),
                  animationTimingFunction: `steps(${Math.max(1, digits.length - 1)}, end)`,
                } as CSSProperties
              }
            >
              {digits.map((d, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed count, where a number may come twice
                <span key={i} className={s.digit}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>
      <div className={s.content} style={{ animationDelay: sec(T.make) }}>
        {beams.map((beam) => (
          <span
            key={beam.x}
            className={s.beam}
            style={{
              left: beam.x,
              height: beam.h,
              width: Math.round(beam.h * 0.611),
              marginLeft: -Math.round(beam.h * 0.3055),
              animationDelay: sec(T.win - 0.1),
            }}
          />
        ))}
        <div className={s.twrap}>
          <h2
            className={s.title}
            style={{
              fontSize: tfs,
              animationDelay: `${sec(T.titleLand - 0.33)}, ${sec(T.titleLand + END_BEAT)}`,
            }}
          >
            {labels.title}
          </h2>
          <div className={s.bulbs} style={{ animationDelay: sec(T.titleLand) }}>
            {Array.from({ length: portrait ? 12 : 16 }, (_, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed row
                key={i}
                className={s.bulb}
                // three groups lighting in turn, every half beat from the title
                style={{
                  animationDelay: sec(T.titleLand + ((i % 3) * END_BEAT) / 2),
                }}
              />
            ))}
          </div>
        </div>
        {L.rows.map((row) => {
          const cs = cardSize(row.w, portrait);
          return (
            <ol
              key={row.base}
              className={s.row}
              style={{
                bottom: (portrait ? 1688 : 720) - row.base,
                gap: row.gap,
              }}
            >
              {row.cols.map((i) => {
                const p = players[i];
                const k = n - 1 - i;
                const win = p.place === 1;
                const rise = T.rise + k * T.step;
                const drop = T.drop + k * T.step;
                // the last place turns first; whoever found it first, all together on the beat
                const flip = win ? T.winFlip : T.flips + k * T.step;
                const h = Math.round(
                  (p.place ? (PLINTH[p.place] ?? 36) : 18) * up,
                );
                const pfs = Math.round(
                  (win ? 40 : p.place === 2 ? 30 : p.place === 3 ? 26 : 20) *
                    up,
                );
                const owner = (
                  <header className={s.ch} style={{ fontSize: cs.hfs }}>
                    <span className={s.own}>
                      <span
                        className={s.oav}
                        style={{ background: p.avatar.color }}
                      >
                        {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                        <img src={avatarSrc(p.avatar)} alt="" />
                      </span>
                      <span className={s.oname}>{p.name}</span>
                    </span>
                    <FrameSeal />
                  </header>
                );
                return (
                  <li
                    key={p.id}
                    className={cn(s.col, win && s.win)}
                    style={
                      {
                        width: row.w,
                        "--seat": seatOf(p.slot),
                        "--on": onOf(p.slot),
                        "--ink": inkOf(p.slot),
                        "--pat": `${cs.pat}px`,
                      } as CSSProperties
                    }
                  >
                    <div
                      className={s.lift}
                      style={{ animationDelay: sec(flip + 0.28) }}
                    >
                      <div
                        className={s.cw}
                        style={{ animationDelay: sec(drop) }}
                      >
                        <div
                          className={s.flip}
                          style={{ animationDelay: sec(flip) }}
                        >
                          <article
                            className={cn(s.card, p.found !== null && s.found)}
                          >
                            {owner}
                            <div className={s.panel}>
                              <CardPicture
                                src={p.card?.imageUrl ?? null}
                                bg={PIC_BG[p.slot % PIC_BG.length]}
                              />
                              <h3 className={s.cn} style={{ fontSize: cs.nfs }}>
                                {p.card?.name ?? "?"}
                              </h3>
                              {p.card?.origin ? (
                                <p className={s.cm}>{p.card.origin}</p>
                              ) : null}
                            </div>
                          </article>
                          <article className={cn(s.card, s.back)}>
                            {owner}
                            <div className={s.panel}>
                              <span className={s.cback}>
                                <span
                                  className={s.disc}
                                  style={{
                                    width: cs.disc,
                                    height: cs.disc,
                                    fontSize: cs.dfs,
                                  }}
                                >
                                  ?
                                </span>
                                <span
                                  className={s.lpill}
                                  style={{
                                    marginTop: cs.lmt,
                                    padding: `${cs.lpy}px ${cs.lpx}px`,
                                  }}
                                >
                                  {/* biome-ignore lint/performance/noImgElement: the static brand file, in its own colours */}
                                  <img
                                    src={logo}
                                    alt=""
                                    style={{ height: cs.logo }}
                                  />
                                </span>
                              </span>
                              <h3 className={s.cn} style={{ fontSize: cs.tfs }}>
                                {labels.who}
                              </h3>
                              {labels.by[i] ? (
                                <p className={s.cm}>{labels.by[i]}</p>
                              ) : null}
                            </div>
                          </article>
                        </div>
                        {win ? (
                          <>
                            <span
                              className={s.halo}
                              style={{ animationDelay: sec(T.win) }}
                            >
                              <span
                                className={s.haloBeat}
                                style={{ animationDelay: sec(T.win) }}
                              />
                            </span>
                            {/* biome-ignore lint/performance/noImgElement: a small svg */}
                            <img
                              className={s.crown}
                              src="/opening/crown.svg"
                              alt=""
                              style={{
                                width: cs.crW,
                                right: cs.crL,
                                top: cs.crT,
                                animationDelay: sec(T.crown),
                              }}
                            />
                          </>
                        ) : null}
                        {SPARKS.map(([dx, dy], kk) => (
                          <i
                            key={`${dx}-${dy}`}
                            className={s.spark}
                            style={
                              {
                                background: win
                                  ? SPARK_C[kk]
                                  : kk % 2
                                    ? "#FFFFFF"
                                    : litOf(p.slot),
                                "--dx": `${dx}px`,
                                "--dy": `${dy}px`,
                                animationDelay: sec(flip + 0.3),
                              } as CSSProperties
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <div
                      className={cn(
                        s.st,
                        win ? s.stWin : p.found === null && s.stOff,
                      )}
                    >
                      <span
                        className={s.stin}
                        style={{ animationDelay: sec(flip + 0.28) }}
                      >
                        {labels.status[i]}
                      </span>
                    </div>
                    <div className={s.pw} style={{ height: h }}>
                      <div
                        className={cn(
                          s.plinth,
                          win ? s.p1 : p.place ? s.pn : s.p0,
                        )}
                        style={{ height: h + 30, animationDelay: sec(rise) }}
                      >
                        <span
                          className={s.pnum}
                          style={{ height: h, fontSize: pfs }}
                        >
                          {win ? (
                            <svg
                              className={s.tro}
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                              style={{ width: 32 * up, height: 32 * up }}
                            >
                              {TROPHY.map((d) => (
                                <path key={d} d={d} />
                              ))}
                            </svg>
                          ) : null}
                          {labels.place[i] ? (
                            <span>{labels.place[i]}</span>
                          ) : null}
                        </span>
                      </div>
                    </div>
                    <span className={s.contact} />
                    {win
                      ? CONFETTI.map((c) => (
                          <i
                            key={c.k}
                            className={s.px}
                            style={
                              {
                                background: c.c,
                                "--dx": `${c.dx}px`,
                                "--dy": `${c.dy}px`,
                                "--ex": `${c.ex}px`,
                                "--ey": `${c.ey}px`,
                                animationDelay: sec(c.d),
                              } as CSSProperties
                            }
                          />
                        ))
                      : null}
                  </li>
                );
              })}
            </ol>
          );
        })}
      </div>
    </div>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
const WhoEnd = memo(WhoEndView);

/** A tall picture is cropped from the top; a wide one (seen once it loads) is shown whole on its pastel; none, a silhouette. */
const WIDE_FROM = 0.86;

/**
 * The character's picture on the card, in the scene's own colours: on its
 * pastel with the "?" marks, like the product's Portrait (which follows the
 * theme), so the scene looks the same in both.
 */
function CardPicture({ src, bg }: { src: string | null; bg: string }) {
  const [seen, setSeen] = useState<{
    src: string;
    ok: boolean;
    wide: boolean;
  } | null>(null);
  const state = seen?.src === src ? seen : null;
  const read = (el: HTMLImageElement | null) => {
    if (src && el?.complete && el.naturalWidth && seen?.src !== src)
      setSeen({
        src,
        ok: true,
        wide: el.naturalWidth / el.naturalHeight > WIDE_FROM,
      });
  };
  const broken = !src || state?.ok === false;
  return (
    <span className={s.por} style={{ background: bg }}>
      <svg viewBox="0 0 80 100" aria-hidden="true">
        <rect width="80" height="100" fill={`url(#${MARKS_ID})`} />
        {broken ? (
          <g fill="#1e2433" fillOpacity="0.16">
            <circle cx="40" cy="42" r="15" />
            <path d="M10 100c0-20 13-32 30-32s30 12 30 32z" />
          </g>
        ) : null}
      </svg>
      {!broken ? (
        // biome-ignore lint/performance/noImgElement: remote library pictures of any size
        <img
          ref={read}
          src={src}
          alt=""
          decoding="async"
          onLoad={(e) => read(e.currentTarget)}
          onError={() => setSeen({ src, ok: false, wide: false })}
          className={cn(s.pic, state?.wide && s.wide)}
        />
      ) : null}
    </span>
  );
}

/** The podium from the room: everyone who played it, best place first. */
function useEndData(): WhoEndData {
  const { view } = useRoomContext();
  const byId = new Map(view.players.map((p) => [p.id, p]));
  const players = view.players
    // someone who left mid-match stays on it only if they had found theirs
    .filter((p) => !p.away || p.discoveredAt !== null)
    .sort(
      (a, b) =>
        (a.place ?? 99) - (b.place ?? 99) ||
        Number(a.gaveUp) - Number(b.gaveUp) ||
        a.seat - b.seat,
    )
    .map((p): EndPlayer => {
      const picker = p.pickedById ? byId.get(p.pickedById) : undefined;
      return {
        id: p.id,
        name: p.name,
        you: p.isYou,
        avatar: p.avatar,
        slot: p.colorSlot,
        card: p.card,
        picker: picker?.name ?? null,
        pickerYou: picker?.isYou ?? false,
        place: p.place,
        found: p.discoveredAt,
        gaveUp: p.gaveUp,
      };
    });
  const data = { players, match: view.gameRound, rounds: view.turns };
  // the same data while the podium looks the same, so the scene isn't drawn again on every update of the room
  const key = JSON.stringify(data);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on what it holds
  return useMemo(() => data, [key]);
}

/** Who am I?'s end scene, drawn from the room (see WhoEndView). */
export function WhoEndScene({ portrait }: EndProps) {
  const t = useTranslations("whoAmI.end");
  const locale = useLocale();
  const data = useEndData();
  const labels = useMemo<WhoEndLabels>(() => {
    const list = new Intl.ListFormat(locale, { type: "conjunction" });
    const names = (xs: string[]) =>
      xs.length > 3
        ? t("namesMore", { first: xs[0], second: xs[1], count: xs.length - 2 })
        : list.format(xs);
    const winners = data.players.filter((p) => p.place === 1);
    const title = !winners.length
      ? t("nobody")
      : winners.length > 1
        ? winners.some((p) => p.you)
          ? t("youTie", {
              names: names(winners.filter((p) => !p.you).map((p) => p.name)),
            })
          : t("winnersTie", { names: names(winners.map((p) => p.name)) })
        : winners[0].you
          ? t("youFirst")
          : t("winner", { name: winners[0].name });
    return {
      match: t("match"),
      rounds: t("rounds", { count: data.rounds }),
      title,
      who: t("whoAreYou"),
      by: data.players.map((p) =>
        p.pickerYou
          ? t("pickedByYou")
          : p.picker
            ? t("pickedBy", { name: p.picker })
            : "",
      ),
      status: data.players.map((p) =>
        p.found !== null
          ? t.rich("found", {
              n: p.found,
              b: (chunks) => <b className={s.stn}>{chunks}</b>,
            })
          : p.gaveUp
            ? t("gaveUp")
            : t("missed"),
      ),
      place: data.players.map((p) =>
        p.place ? t("place", { place: p.place }) : "",
      ),
    };
  }, [data, t, locale]);
  return (
    <WhoEnd
      data={data}
      labels={labels}
      portrait={portrait}
      logo={logoFile(locale)}
    />
  );
}

/** Every picture file the scene paints, to fetch during the match (the players' avatars and characters come with the room). */
export const WHO_END_IMAGES = (_portrait: boolean): string[] => [
  "/opening/crown.svg",
  "/patterns/q-marks.svg",
  "/brand/logo.svg",
  "/brand/logo-ja.svg",
];

/** Past the canvas before the scene paints: the stage's blue, the one of the theme (as its opening has it). */
export const WHO_END_BACKDROP = "var(--brand-stage)";
