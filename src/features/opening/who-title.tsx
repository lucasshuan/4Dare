"use client";

import { type CSSProperties, memo } from "react";
import { SEAT_COLORS } from "@/game/seat-colors";
import { cn } from "@/lib/cn";
import { avatarSrc, inkOf, seatOf, type TitleProps } from "./title-kit";
import { sec, TITLE_BEAT, whoTimes } from "./title-timing";
import s from "./who-title.module.css";

/** The cards' tilts, one per seat. */
const TILT = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2, -2.2, 1.6, -1, 2];
/** The pixel sparks of a card landing: [where on its base (%), x, y (px)]. */
const SPARKS = [
  [6, -42, -30],
  [2, -56, 4],
  [22, -22, -52],
  [94, 42, -30],
  [98, 56, 4],
  [78, 22, -52],
] as const;
const SPARK_C = [
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
  "#FFFFFF",
  "#F6E3A1",
  "#FFFFFF",
];
/** The forehead card's characters: a bust with a hat (viewBox 48×56); every outline runs the same way, so they add up without holes. */
const BUST =
  "M14 33a10 10 0 1 1 20 0a10 10 0 1 1 -20 0Z M6 56Q6 45 24 45Q42 45 42 56Z ";
const HATS = [
  // king
  "M14 24L15 12L19.5 17L24 9L28.5 17L33 12L34 24Z",
  // wizard
  "M24 1L33 21H15Z M11 21H37V24H11Z",
  // chef
  "M12 12a6 6 0 1 1 12 0a6 6 0 1 1 -12 0Z M18 9a6 6 0 1 1 12 0a6 6 0 1 1 -12 0Z M24 12a6 6 0 1 1 12 0a6 6 0 1 1 -12 0Z M16 14H32V23H16Z",
  // cowboy
  "M5 23Q8 19 15 20L17 9Q24 6 31 9L33 20Q40 19 43 23Q24 29 5 23Z",
  // viking
  "M13 25a11 11 0 0 1 22 0Z M14 22Q5 19 6 7Q10 15 16 18Z M34 22L32 18Q38 15 42 7Q43 19 34 22Z",
  // top hat
  "M16 4H32V18H16Z M10 18H38V22H10Z",
];
/** The roulette's frames: 8 going by, the last is the player's own character. */
const REEL_N = 9;
/** Each frame's background (it changes with the character): the avatars' light pastels. */
const CARD_BG = [
  "#F6E3A1",
  "#B4CFF7",
  "#C8EFC9",
  "#F3D3B8",
  "#CDBFF6",
  "#BFE3EA",
  "#F7C9D9",
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
/** The big "?" behind the title once the stage opens: [left %, top %, size px, turn deg]. */
const BIG_Q = [
  [3, 44, 280, -12],
  [86, 6, 180, 10],
  [76, 58, 320, 8],
] as const;
const BULBS = 18;

/** The cards' sizes by how many play: on a landscape stage one row; upright a grid of two columns (three past six). */
function sizes(n: number, portrait: boolean) {
  if (portrait) {
    const sz =
      n <= 4
        ? {
            cardW: 316,
            av: 200,
            padT: 40,
            padX: 22,
            padB: 32,
            fs: 36,
            gap: 44,
            rowGap: 72,
            gapRing: 6,
            ring: 12,
            cols: 2,
          }
        : n <= 6
          ? {
              cardW: 290,
              av: 172,
              padT: 34,
              padX: 20,
              padB: 28,
              fs: 34,
              gap: 40,
              rowGap: 64,
              gapRing: 6,
              ring: 11,
              cols: 2,
            }
          : {
              cardW: 212,
              av: 124,
              padT: 26,
              padX: 14,
              padB: 22,
              fs: 26,
              gap: 24,
              rowGap: 52,
              gapRing: 5,
              ring: 9,
              cols: 3,
            };
    return { ...sz, castW: sz.cardW * sz.cols + sz.gap * (sz.cols - 1) };
  }
  const sz =
    n <= 4
      ? {
          cardW: 196,
          av: 120,
          padT: 24,
          padX: 16,
          padB: 20,
          fs: 22,
          gap: 28,
          gapRing: 4,
          ring: 8,
        }
      : n <= 6
        ? {
            cardW: 168,
            av: 100,
            padT: 20,
            padX: 14,
            padB: 18,
            fs: 20,
            gap: 20,
            gapRing: 4,
            ring: 8,
          }
        : n <= 8
          ? {
              cardW: 136,
              av: 80,
              padT: 18,
              padX: 12,
              padB: 16,
              fs: 17,
              gap: 14,
              gapRing: 3,
              ring: 6,
            }
          : {
              cardW: 112,
              av: 66,
              padT: 16,
              padX: 10,
              padB: 14,
              fs: 15,
              gap: 10,
              gapRing: 3,
              ring: 6,
            };
  return { ...sz, rowGap: 0, cols: n, castW: null as number | null };
}

/** A seat's number in the app's colours (--seat-1..10). */
const seatNo = (slot: number) => (slot % SEAT_COLORS) + 1;

/**
 * Who am I?'s title scene: "Match 1" comes in with the voice, holds and flies
 * to the corner as the music starts; from then on everything falls on the
 * beat: the cast jumps on stage in one wave, a card drops on every forehead and
 * spins like a roulette until it stops on a character, the cards flip to "?"
 * and bob with the music, the stage opens in a circle with turning sun rays and
 * the title slams on the downbeat. On a rematch the number rolls on, the cards
 * land together, last match's winner gets the crown and the title slams.
 */
function WhoTitleScene({
  players,
  n,
  first,
  portrait,
  labels,
}: TitleProps & { labels: { match: string; title: string } }) {
  const count = players.length;
  const t = whoTimes(first, count);
  const sz = sizes(count, portrait);
  const id = (() => {
    const w = Math.round(sz.av * 0.52);
    const h = Math.round(sz.av * 0.64);
    return {
      w,
      h,
      l: Math.round((sz.av - w) / 2),
      t: -Math.round(sz.av * 0.24),
      reelY: -(REEL_N - 1) * h,
      fs: Math.round(h * 0.62),
    };
  })();
  const kc = {
    w: Math.round(sz.av * 0.96),
    l: Math.round(sz.av * 0.5 - sz.av * 0.48 - sz.av * 0.22),
    t: Math.round(-sz.av * 0.96 * 0.765 * 0.92),
  };
  const digits = first ? [n] : [n - 1, n];
  return (
    <div className={cn(s.screen, portrait && s.portrait)}>
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
      <div className={cn(s.layer, s.center)}>
        <div
          className={s.num}
          style={{ animationDelay: `${sec(t.numIn)}, ${sec(t.numOut)}` }}
        >
          <span className={s.numLabel}>{labels.match}</span>
          <span className={s.digitWin}>
            <span
              className={cn(s.digitCol, !first && s.roll)}
              style={{ animationDelay: sec(t.roll) }}
            >
              {digits.map((d) => (
                <span key={d} className={s.digit}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>
      <div
        className={s.reveal}
        style={{
          animationDelay: sec(t.reveal),
          animationDuration: sec(t.revealDur),
        }}
      >
        <span
          className={s.rays}
          style={{ animationDelay: `0s, ${sec(t.reveal)}` }}
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
      </div>
      <div className={s.chip} style={{ animationDelay: sec(t.chip) }}>
        <span className={s.chipLabel}>{labels.match}</span>
        <span className={s.chipNum}>{n}</span>
      </div>
      <div className={s.titleWrap}>
        <h2
          className={s.gtitle}
          // it hits at 55% of its animation (0.33 s), on the downbeat, and pulses from the next beat
          style={{
            animationDelay: `${sec(t.titleLand - 0.33)}, ${sec(t.titleLand + TITLE_BEAT)}`,
          }}
        >
          {labels.title}
        </h2>
        <div className={s.bulbs} style={{ animationDelay: sec(t.titleLand) }}>
          {Array.from({ length: BULBS }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed row
              key={i}
              className={s.bulb}
              // three groups lighting in turn, every half beat from the title
              style={{
                animationDelay: sec(t.titleLand + ((i % 3) * TITLE_BEAT) / 2),
              }}
            />
          ))}
        </div>
      </div>
      <div className={s.castWrap}>
        <div
          className={s.cast}
          style={{
            width: sz.castW ?? undefined,
            gap: portrait ? `${sz.rowGap}px ${sz.gap}px` : sz.gap,
          }}
        >
          {players.map((p, i) => {
            // the card lands at 62% of its jump (0.31 s); the sparks fly then
            const land = t.land + i * t.step;
            const tilt = TILT[i % TILT.length];
            return (
              <div
                key={p.id}
                className={s.pcard}
                style={{ width: sz.cardW, animationDelay: sec(land - 0.31) }}
              >
                <div
                  className={s.pcardIn}
                  style={{
                    padding: `${sz.padT}px ${sz.padX}px ${sz.padB}px`,
                    transform: `rotate(${tilt}deg)`,
                  }}
                >
                  <div className={s.avw}>
                    <span
                      className={s.av}
                      style={
                        {
                          width: sz.av,
                          height: sz.av,
                          background: p.avatar.color,
                          "--gap-w": `${sz.gapRing}px`,
                          "--ring-w": `${sz.ring}px`,
                          "--ring": seatOf(p.slot),
                          "--ring-dark": `var(--seat-${seatNo(p.slot)})`,
                        } as CSSProperties
                      }
                    >
                      {/* biome-ignore lint/performance/noImgElement: generated svg or a remote picture */}
                      <img src={avatarSrc(p.avatar)} alt="" />
                    </span>
                    {first && t.q !== null ? (
                      <ForeheadCard
                        i={i}
                        tilt={tilt}
                        id={id}
                        drop={t.idDrop}
                        qBob={t.qBob}
                        flip={t.q + i * t.stag}
                        spin={t.spin}
                        spinDur={t.spinDur + i * t.reelStag}
                      />
                    ) : null}
                    {p.crowned && !first ? (
                      // biome-ignore lint/performance/noImgElement: a small svg
                      <img
                        className={s.kcrown}
                        src="/opening/crown.svg"
                        alt=""
                        style={{
                          width: kc.w,
                          left: kc.l,
                          top: kc.t,
                          animationDelay: sec(t.crown),
                        }}
                      />
                    ) : null}
                  </div>
                  <span
                    className={s.pname}
                    style={
                      {
                        "--name": inkOf(p.slot),
                        "--name-dark": `var(--seat-${seatNo(p.slot)}-ink)`,
                        fontSize:
                          p.name.length > 10 ? Math.round(sz.fs * 0.74) : sz.fs,
                      } as CSSProperties
                    }
                  >
                    {p.name}
                  </span>
                </div>
                {SPARKS.map(([x, dx, dy], k) => (
                  <i
                    key={`${x}-${dx}`}
                    className={s.spark}
                    style={
                      {
                        left: `${x}%`,
                        background: SPARK_C[k],
                        "--dx": `${dx}px`,
                        "--dy": `${dy}px`,
                        animationDelay: sec(land),
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The card on a player's forehead: it drops, spins through characters to theirs, flips to "?" and bobs. */
function ForeheadCard({
  i,
  tilt,
  id,
  drop,
  qBob,
  flip,
  spin,
  spinDur,
}: {
  i: number;
  tilt: number;
  id: { w: number; h: number; l: number; t: number; reelY: number; fs: number };
  drop: number;
  qBob: number;
  flip: number;
  spin: number;
  spinDur: number;
}) {
  return (
    <span
      className={s.idcPos}
      style={{
        left: id.l,
        top: id.t,
        width: id.w,
        height: id.h,
        transform: `rotate(${(-tilt * 2).toFixed(1)}deg)`,
      }}
    >
      <span
        className={s.idc}
        style={{ animationDelay: `${sec(drop)}, ${sec(qBob)}` }}
      >
        <span className={s.idcIn} style={{ animationDelay: sec(flip) }}>
          <span className={cn(s.idf, s.front)}>
            <span
              className={s.reel}
              style={
                {
                  "--reel-y": `${id.reelY}px`,
                  animationDelay: sec(spin),
                  animationDuration: sec(spinDur),
                } as CSSProperties
              }
            >
              {Array.from({ length: REEL_N }, (_, k) => (
                <svg
                  // biome-ignore lint/suspicious/noArrayIndexKey: the reel's fixed frames
                  key={k}
                  width={id.w}
                  height={id.h}
                  viewBox="-6 -4 60 66"
                  style={{ background: CARD_BG[(i * 3 + k) % CARD_BG.length] }}
                  aria-hidden="true"
                >
                  <path
                    d={
                      BUST +
                      HATS[(k === REEL_N - 1 ? i : i * 2 + k + 1) % HATS.length]
                    }
                    fill="#1E2433"
                  />
                </svg>
              ))}
            </span>
          </span>
          <span className={cn(s.idf, s.back)} style={{ fontSize: id.fs }}>
            ?
          </span>
        </span>
      </span>
    </span>
  );
}

/** Drawn again only when what it draws changes (not on every update of the room around it). */
export const WhoTitle = memo(WhoTitleScene);
