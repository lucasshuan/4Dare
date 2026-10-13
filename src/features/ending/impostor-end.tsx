"use client";

import { useTranslations } from "next-intl";
import { type CSSProperties, memo, useMemo } from "react";
import { useRoomContext } from "@/features/data/room-context";
import {
  blindsFor,
  lineupOf,
  motes,
  pad,
  Ruler,
  roomOf,
} from "@/features/opening/impostor-set";
import { CASTS, type SuitSize, suitGeo } from "@/features/opening/suits";
import {
  type FramePlay,
  Hole,
  Pose,
  SuspectFigure,
} from "@/features/opening/suspect";
import { type Bleed, litOf, seatOf } from "@/features/opening/title-kit";
import { sec } from "@/features/opening/title-timing";
import type { Avatar } from "@/game/types";
import { avatarEyesUri } from "@/lib/avatar";
import { cn } from "@/lib/cn";
import { END_ACTS, END_BEAT, type EndProps } from "./end-kit";
import s from "./impostor-end.module.css";

/** The pictures the scene paints with: the opening's room (a window's way up), its sides, and the rest. */
export const IMPOSTOR_END_IMAGES = (portrait: boolean) => [
  ...["", "-l", "-r"].map(
    (side) => `/opening/impostor-room${portrait ? "-tall" : ""}${side}.webp`,
  ),
  "/opening/smoke.webp",
  "/opening/case-wood.webp",
  "/opening/grain.webp",
  "/opening/glass-smudge.webp",
  "/opening/stamp-mask.webp",
];

/** It opens on black, where the opening left the room dark. */
export const IMPOSTOR_END_BACKDROP = "#000000";

/** The k-th beat from the first light (0.85 s in). */
const b = (k: number) => 0.85 + k * END_BEAT;

/**
 * The timeline. The lights come back one column at a time and the names go
 * up; when the crew won, the light cuts out, the impostors' eyes burn red, the
 * light comes back with a flash and the cards turn; when the impostors won,
 * the cards turn right away and the winners dance. The case board flies in,
 * changes its letters and takes the stamp, and the room steps back for the
 * reward card (END_ACTS: b(12)).
 */
const T = {
  /** Each column's light coming on. */
  c: [b(0), b(0) + 0.16, b(0) + 0.32, b(0) + 0.48],
  /** The names going up, one after the other. */
  names: b(1) + 0.1,
  nameStep: 0.12,
  cut: b(4),
  solo: b(5),
  back: b(6),
  board: b(6) + 0.35,
  num: b(8),
  row3: b(8) + 0.12,
  letterStep: 0.028,
  stamp: b(10) - 0.3,
  cam: END_ACTS.impostor.card - END_BEAT + 0.15,
  flick: b(13),
};

/**
 * Each canvas's camera stepping back for the reward card: on a screen the
 * room goes up and to the right of it; upright the overlay takes the lower
 * part of the screen, so the board and the line-up go into the upper part.
 */
const CAM = {
  landscape: { x: 360, y: 86, s: 0.7 },
  portrait: { x: 129, y: -190, s: 0.67 },
} as const;

/**
 * The case board: centred on the canvas (its pivot at its middle as it first
 * stands), from the corner the opening sent it to, flying up to wait for the
 * stamp.
 */
const BOARD = {
  landscape: {
    from: { x: -460, y: -236, s: 0.34 },
    to: "translate(0px, -250px) scale(0.62)",
  },
  portrait: {
    from: { x: -248, y: -744, s: 0.4 },
    to: "translate(0px, -170px) scale(0.86)",
  },
} as const;

/** Where each column's light ends, in canvas pixels: dark from the first to the second (left to right). */
const EDGES = {
  landscape: [
    [262, 378],
    [582, 698],
    [902, 1018],
  ],
  portrait: [
    [160, 230],
    [355, 425],
    [550, 620],
  ],
} as const;

/** A suspect as the end draws them. */
interface EndSuspect {
  id: string;
  /** As the viewer reads it. */
  name: string;
  avatar: Avatar;
  slot: number;
  impostor: boolean;
}

/** What the scene draws: the line-up as the opening had it, who won, the two cards' pictures. */
interface EndData {
  players: EndSuspect[];
  /** The case number (the opening's). */
  n: number;
  crew: boolean;
  crewPicture: string | null;
  impostorPicture: string | null;
}

interface EndLabels {
  case: string;
  verdict: string;
  stamp: string;
}

/**
 * The match's line-up and its result, from the room: everyone dealt in, in
 * the opening's order (the deal's, which is the turn order), those who left
 * mid-match too, in their place.
 */
function useEndData(): EndData | null {
  const { view } = useRoomContext();
  const end = view.imp?.end ?? null;
  const data: EndData | null = end
    ? {
        players: view.players
          .filter((p) => p.turnOrder !== null)
          .sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0))
          .map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            slot: p.colorSlot,
            impostor: end.impostorIds.includes(p.id),
          })),
        n: view.gameRound,
        crew: end.winner === "crew",
        crewPicture: end.crew.imageUrl,
        impostorPicture: end.impostor.imageUrl,
      }
    : null;
  // the same data while it looks the same, so the scene isn't drawn again on every update of the room
  const key = JSON.stringify(data);
  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed on what the data holds
  return useMemo(() => data, [key]);
}

/** The Impostor's end, from the room: who stood in the line-up and who won. */
export function ImpostorEndScene({ portrait, bleed }: EndProps) {
  const data = useEndData();
  const t = useTranslations("impostor.end");
  const crew = data?.crew ?? true;
  const many = data ? data.players.filter((p) => p.impostor).length : 1;
  const labels = useMemo<EndLabels>(
    () => ({
      case: t("case"),
      verdict: crew ? t("crewWon") : t("impostorsWon", { count: many }),
      stamp: crew ? t("closed") : t("filed"),
    }),
    [t, crew, many],
  );
  if (!data) return null;
  return (
    <ImpostorEnd
      data={data}
      labels={labels}
      portrait={portrait}
      bleed={bleed}
    />
  );
}

/** The verdict's letter size: the prototype's two sizes, smaller still for a longer word (wide letters count double). */
function verdictSize(word: string) {
  const chars = [...word];
  const em = chars.reduce(
    (w, ch) => w + (/[　-鿿＀-￯]/.test(ch) ? 1.05 : 0.65),
    0,
  );
  return Math.min(chars.length > 19 ? 31 : 37, Math.floor(460 / em));
}

/**
 * The Impostor's end: "Lights on". It starts where the opening left the
 * line-up, in the dark with only the eyes. The lights come back column by
 * column and each suspect's name goes up on a plaque over their head. If the
 * crew won, the light cuts out, only the impostors' eyes come back, in red,
 * and with the light and a flash they flinch while the cards in every paw
 * turn: the crew's character for the crew, another for the impostors. If the
 * impostors won, the cards turn at once and the impostors dance. The case
 * board flies in from its corner, its number drops to the small row, the
 * verdict comes in under it and the stamp closes (or files) the case; then
 * the room steps back for the reward card.
 */
function ImpostorEndPure({
  data,
  labels,
  portrait,
  bleed,
}: {
  data: EndData;
  labels: EndLabels;
  portrait: boolean;
  bleed: Bleed;
}) {
  const crew = data.crew;
  const room = roomOf(portrait);
  const W = room.w;
  const H = room.h;
  const cam = CAM[portrait ? "portrait" : "landscape"];
  // the window, in canvas pixels: the room, the blinds and the glass run to its edges
  const win = { w: W + 2 * bleed.x, h: H + 2 * bleed.y };
  const bl = blindsFor(portrait, win.w, win.h);
  // what the room must cover (its own pixels) to fill the window, before and after the camera steps back
  const box = {
    l: Math.floor(Math.min(-bleed.x, (-bleed.x - cam.x) / cam.s)) - 2,
    r: Math.ceil(Math.max(W + bleed.x, (W + bleed.x - cam.x) / cam.s)) + 2,
    t: Math.floor(Math.min(-bleed.y, (-bleed.y - cam.y) / cam.s)) - 2,
    b: Math.ceil(Math.max(H + bleed.y, (H + bleed.y - cam.y) / cam.s)) + 2,
  };
  const veil = {
    left: box.l,
    top: box.t,
    width: box.r - box.l,
    height: box.b - box.t,
  };
  const at = (x: number) => `${Math.round(x - box.l)}px`;
  // past the four lights the room goes dark: the wall and floor beyond the canvas have no light
  const fall = `linear-gradient(90deg, ${(
    [
      [-380, 0.94],
      [-230, 0.86],
      [-100, 0.62],
      [0, 0.3],
      [40, 0],
      [W - 40, 0],
      [W, 0.3],
      [W + 60, 0.62],
      [W + 190, 0.86],
      [W + 340, 0.94],
    ] as const
  )
    .map(([x, a]) => `rgba(3, 1, 7, ${a}) ${at(x)}`)
    .join(", ")})`;
  const edges = EDGES[portrait ? "portrait" : "landscape"];
  const columns = [
    "rgba(0, 0, 0, 0.95)",
    ...edges.map(
      ([a, z]) =>
        `linear-gradient(90deg, rgba(0, 0, 0, 0) ${at(a)}, rgba(0, 0, 0, 0.95) ${at(z)})`,
    ),
  ];
  const flick = `linear-gradient(90deg, rgba(5, 3, 10, 0) ${at(edges[2][0])}, #05030a ${at(edges[2][1])})`;
  // a light coming on, and (the crew won) cut and back
  const lit = (on: number) =>
    crew ? `${sec(on)}, ${sec(T.cut)}, ${sec(T.back)}` : sec(on);
  const count = data.players.length;
  const { sz, oneRow, perRow, rowSize, spots } = lineupOf(portrait, count);
  const tag = {
    w: sz.w - 6,
    f: portrait
      ? perRow <= 3
        ? 17
        : perRow <= 4
          ? 15
          : 14
      : count <= 6
        ? 15
        : count <= 8
          ? 14
          : 12,
  };
  const suspects = data.players.map((p, i) => ({ p, i, ...spots[i] }));
  const dust = motes(portrait);
  const num = pad(data.n);
  const board = BOARD[portrait ? "portrait" : "landscape"];
  const camStyle = {
    "--cam": `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`,
    animationDelay: sec(T.cam),
  } as CSSProperties;
  return (
    <div className={cn(s.root, portrait && s.portrait, crew && s.crew)}>
      <div className={s.screen}>
        <div className={cn(s.win, s.bg)} />
        {/* the room, larger than the screen (wall, floor and ceiling past its edges), so the camera can step back */}
        <div className={s.cam} style={camStyle}>
          <div className={s.room}>
            <div
              className={s.plate}
              style={
                {
                  "--tl": `${-box.l + 4}px`,
                  "--tr": `${box.r - W + 4}px`,
                } as CSSProperties
              }
            />
            <Ruler portrait={portrait} className={s.ruler} />
            <div className={s.veil} style={{ ...veil, background: fall }} />
            {columns.map((bg, c) => (
              <div
                key={T.c[c]}
                className={cn(s.veil, s.colOn)}
                style={{ ...veil, background: bg, animationDelay: sec(T.c[c]) }}
              />
            ))}
            {crew ? (
              <div
                className={cn(s.veil, s.cut)}
                style={{
                  ...veil,
                  animationDelay: `${sec(T.cut)}, ${sec(T.back)}`,
                }}
              />
            ) : null}
            <div
              className={cn(s.veil, s.flick)}
              style={{
                ...veil,
                background: flick,
                animationDelay: sec(T.flick),
              }}
            />
            {room.lights.map((x, k) => (
              <div
                key={x}
                className={s.beam}
                style={{
                  left: x,
                  animationDelay: crew
                    ? `${sec(T.c[k])}, ${sec(T.cut)}, ${sec(T.back)}`
                    : `${sec(T.c[k])}, ${sec(T.back)}`,
                }}
              >
                <span className={s.cone} />
                <span className={s.smoke}>
                  <span
                    className={s.smokeTex}
                    style={{ animationDelay: `${-(k * 7.3)}s` }}
                  />
                </span>
                {dust[k].map((m) => (
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
                      on={T.c[x.col]}
                      lit={lit(T.c[x.col])}
                      crew={crew}
                      picture={
                        x.p.impostor ? data.impostorPicture : data.crewPicture
                      }
                      tag={tag}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        {/* the glass: the light falling off to the edges, the blinds bunched up, the case board, the glass itself */}
        <div className={cn(s.win, s.dark)} />
        <div
          className={s.blinds}
          style={
            {
              left: -bleed.x,
              top: -bleed.y,
              width: win.w,
              "--on": sec(T.c[0]),
              "--cut": sec(T.cut),
              "--back": sec(T.back),
            } as CSSProperties
          }
        >
          <span className={s.stack} style={{ height: bl.to - 20 }} />
          {bl.ladders.map((left) => (
            <span
              key={left}
              className={s.ladder}
              style={{ left, height: bl.ladderEnd }}
            />
          ))}
          <span className={s.rail} style={{ top: bl.to - 2 }} />
          <span className={s.headrail} />
          <span className={s.cord} style={{ left: bl.cord }}>
            <span className={s.tassel} />
          </span>
          <span
            className={cn(s.dim, s.bunchDim)}
            style={{ height: bl.bunch, animationDelay: lit(T.c[0]) }}
          />
        </div>
        <div className={s.cam} style={camStyle}>
          <div
            className={s.bwrap}
            style={{ left: W / 2 - 280, top: H / 2 - 138 }}
          >
            <div
              className={s.board}
              style={
                {
                  "--from": `translate(${board.from.x - bleed.x}px, ${board.from.y - bleed.y}px) scale(${board.from.s})`,
                  "--to": board.to,
                  animationDelay: `${sec(T.board)}, ${sec(T.stamp)}`,
                } as CSSProperties
              }
            >
              <span className={s.screw} style={{ left: 3, top: 3 }} />
              <span className={s.screw} style={{ right: 3, top: 3 }} />
              <span className={s.screw} style={{ left: 3, bottom: 3 }} />
              <span className={s.screw} style={{ right: 3, bottom: 3 }} />
              <div className={s.felt}>
                <div className={s.row}>
                  {[...labels.case].map((ch, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: the word's letters, in place
                    <span key={i} className={cn(s.lt, s.small)}>
                      {ch}
                    </span>
                  ))}
                  {[" ", ...num].map((ch, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: the number's digits, in place
                      key={`n${i}`}
                      className={cn(s.lt, s.small, s.in)}
                      style={{ animationDelay: sec(T.num + 0.16 + i * 0.07) }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                <div className={s.mid}>
                  <div className={s.row}>
                    {[...num].map((ch, i) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: the number's digits, in place
                        key={i}
                        className={cn(s.lt, s.big, s.out)}
                        style={{ animationDelay: sec(T.num + i * 0.05) }}
                      >
                        {ch}
                      </span>
                    ))}
                  </div>
                  <span
                    className={s.stamp}
                    style={{ animationDelay: sec(T.stamp) }}
                  >
                    {labels.stamp}
                  </span>
                </div>
                <div
                  className={cn(s.row, s.row3)}
                  style={{ animationDelay: sec(T.row3) }}
                >
                  {[...labels.verdict].map((ch, i) => (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: the verdict's letters, in place
                      key={i}
                      className={cn(s.lt, s.verdict, s.in)}
                      style={{
                        fontSize: verdictSize(labels.verdict),
                        animationDelay: sec(T.row3 + 0.12 + i * T.letterStep),
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
              <span
                className={cn(s.dim, s.boardDim)}
                style={{ animationDelay: lit(T.c[0]) }}
              />
            </div>
          </div>
        </div>
        <div className={cn(s.win, s.frame)} />
        <div
          className={cn(s.win, s.glass)}
          style={{ animationDelay: lit(T.c[3]) }}
        >
          <div className={cn(s.layer, s.sheen)} />
          <div className={cn(s.layer, s.smudge)} />
          <div className={cn(s.layer, s.refl)} />
        </div>
        <div className={cn(s.win, s.vig)} />
        <div
          className={cn(s.win, s.flash)}
          style={{ animationDelay: sec(T.back) }}
        />
        <span className={s.grain} />
        <span className={cn(s.win, s.black)} />
      </div>
    </div>
  );
}

/**
 * One suspect where the opening left them: the costume with its face and
 * card (dimmed with their column's light), their eyes in the dark, the
 * impostor's red ones, and their name on a plaque over their head.
 */
function Suspect({
  p,
  i,
  sz,
  rowSize,
  dx,
  on,
  lit,
  crew,
  picture,
  tag,
}: {
  p: EndSuspect;
  i: number;
  sz: SuitSize;
  rowSize: number;
  dx: number;
  /** Their column's light coming on. */
  on: number;
  /** The delays of the light on them: on, and cut and back. */
  lit: string;
  crew: boolean;
  picture: string | null;
  tag: { w: number; f: number };
}) {
  const seat = seatOf(p.slot);
  const glow = litOf(p.slot);
  const g = suitGeo(CASTS[i % CASTS.length], sz, rowSize, seat);
  const won = crew !== p.impostor;
  const caught = crew && p.impostor;
  // the cards turn once the light is back for good (the crew caught them) or just after the names (the impostors won)
  const turnAt = crew ? T.back + 0.3 : T.cut + 0.1;
  // who won dances on the spot once the cards have turned: the costume's 4 frames, on the beat
  const danceAt = turnAt + 0.75 + (i % 3) * 0.105;
  const dance: FramePlay | undefined = won
    ? { delay: danceAt, dur: 2 * END_BEAT, count: "infinite" }
    : undefined;
  const eyes = avatarEyesUri(p.avatar, glow);
  return (
    <div className={s.slot} style={{ width: sz.w }}>
      <div className={s.stand}>
        <span
          className={s.foot}
          style={{ width: g.footW, marginLeft: g.footML }}
        />
        <div
          className={cn(s.fig, caught ? s.flinch : won && s.dancing)}
          style={{
            width: g.fw,
            height: g.fh,
            animationDelay: sec(caught ? T.back : danceAt),
          }}
        >
          {/* the costume, its face and its card in their column's light (one filter, with its shadow) */}
          <div
            className={s.lit}
            style={{ "--dx": `${dx}px`, animationDelay: lit } as CSSProperties}
          >
            <SuspectFigure
              g={g}
              i={i}
              seat={seat}
              avatar={p.avatar}
              play={dance}
              picture={{ at: turnAt + i * 0.09, src: picture }}
            />
          </div>
          {/* the eyes, lit in the dark: gone as the light comes, back in the cut, and only the impostor's stay */}
          <Pose g={g} play={dance}>
            <Hole g={g}>
              <span
                className={s.eyes}
                style={{
                  animationDelay: crew
                    ? `${sec(on)}, ${sec(T.cut)}, ${sec(T.solo)}`
                    : sec(on),
                }}
              >
                {/* biome-ignore lint/performance/noImgElement: generated svg */}
                <img
                  src={eyes}
                  alt=""
                  style={{
                    filter: `drop-shadow(0 0 2px ${glow}) drop-shadow(0 0 8px ${glow})`,
                    animationDelay: `${-(i * 0.83)}s`,
                  }}
                />
              </span>
              {caught ? (
                <span
                  className={s.red}
                  style={{ animationDelay: `${sec(T.solo)}, ${sec(T.back)}` }}
                >
                  <i style={{ maskImage: `url("${eyes}")` }} />
                </span>
              ) : null}
            </Hole>
          </Pose>
        </div>
      </div>
      {/* the name on a plaque hanging over them (the paws hold the card), cut short if it is long */}
      <span
        className={s.tag}
        style={{ left: Math.round((sz.w - g.fw) / 2 + g.ax + g.avs / 2) }}
      >
        <span
          className={s.tagIn}
          style={{ animationDelay: sec(T.names + i * T.nameStep) }}
        >
          <span className={s.plaque} style={{ maxWidth: tag.w }}>
            <b style={{ fontSize: tag.f }}>{p.name}</b>
          </span>
          {crew ? (
            <span
              className={s.tagDim}
              style={{ animationDelay: `${sec(T.cut)}, ${sec(T.back)}` }}
            />
          ) : null}
        </span>
      </span>
    </div>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
const ImpostorEnd = memo(ImpostorEndPure);
