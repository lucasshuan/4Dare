// The Impostor's set, shared by its opening and its end: the room on each
// canvas (its four ceiling lights, the blinds, the height chart's ruler), the
// dust in the beams, and where the suspects stand in the line-up.
import type { SuitSize } from "./suits";
import { rnd } from "./title-kit";

/**
 * Each canvas's room: where its four ceiling lights hang (one per column they
 * put out), the blinds (their slats, ladders and cord, laid out over the
 * whole window) and the height chart's lines, which the ruler on the right
 * marks.
 */
export const ROOM = {
  landscape: {
    w: 1280,
    h: 720,
    lights: [160, 480, 800, 1120],
    colW: 320,
    mid: 640,
    // across the window, from its left
    ladders: [318 / 1280, 960 / 1280],
    ladder: { cut: 20, end: 16 },
    cord: 28,
    slats: {
      n: 16,
      pitch: 44,
      top: 18,
      h: 43,
      stack: 2.6,
      pad: 1,
      to: 64,
      bunch: 89,
    },
    ruler: {
      lines: [
        274, 302.5, 333.5, 363.5, 393.5, 422.5, 452.5, 484, 512.5, 542.5, 572.5,
      ],
      font: 16,
      text: 58,
      major: 46,
      minor: 22,
      thick: 2.4,
    },
  },
  portrait: {
    w: 780,
    h: 1688,
    lights: [97, 292, 487, 682],
    colW: 195,
    mid: 390,
    ladders: [190 / 780, 590 / 780],
    ladder: { cut: 18, end: 18 },
    cord: 36,
    slats: {
      n: 26,
      pitch: 66,
      top: 18,
      h: 64,
      stack: 3.6,
      pad: 2,
      to: 118,
      bunch: 171,
    },
    ruler: {
      lines: [
        850, 888.5, 933.5, 970.5, 1009.5, 1049.5, 1094, 1129.5, 1169.5, 1209.5,
        1249.5,
      ],
      font: 21,
      text: 78,
      major: 61,
      minor: 29,
      thick: 3.3,
    },
  },
} as const;

/** The room of a canvas. */
export const roomOf = (portrait: boolean) =>
  ROOM[portrait ? "portrait" : "landscape"];

/** The ruler's marks, 2,20 down to 0,20, dimmer as the light falls off down the wall. */
const MARKS = [
  "2,20",
  "2,00",
  "1,80",
  "1,60",
  "1,40",
  "1,20",
  "1,00",
  "0,80",
  "0,60",
  "0,40",
  "0,20",
];
const MARK_LIGHT = [
  0.95, 1, 0.95, 0.93, 0.91, 0.88, 0.87, 0.78, 0.71, 0.63, 0.53,
];
const markColor = (f: number) =>
  `rgb(${Math.round(240 * f)} ${Math.round(230 * f)} ${Math.round(218 * f)})`;

/** The blinds laid over a window `w`×`h` (canvas pixels): enough slats to reach its foot. */
export function blindsFor(portrait: boolean, w: number, h: number) {
  const room = roomOf(portrait);
  const sl = room.slats;
  const n = Math.max(sl.n, Math.ceil((h - sl.top - sl.h) / sl.pitch) + 1);
  const more = (n - sl.n) * sl.stack;
  const from = sl.top + (n - 1) * sl.pitch + sl.h + sl.pad;
  const to = sl.to + more;
  return {
    n,
    from,
    to,
    center: h / 2,
    bunch: sl.bunch + more,
    ladders: room.ladders.map((f) => Math.round(w * f)),
    ladderH: from - room.ladder.cut,
    ladderEnd: to - room.ladder.end,
    cord: w - room.cord,
  };
}

/** The dust in each light's beam: nine motes each, the same everywhere. */
export function motes(portrait: boolean) {
  return roomOf(portrait).lights.map((_, b) =>
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

export const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The line-up of `count` suspects: their sizes, and each one's row, the
 * column of light they stand in and how far their shadow falls from the
 * nearest light. Upright: one row up to four, else two, the first half on a
 * step at the back.
 */
export function lineupOf(portrait: boolean, count: number) {
  const room = roomOf(portrait);
  const oneRow = !portrait || count <= 4;
  const perRow = oneRow ? count : Math.ceil(count / 2);
  const sz: SuitSize = portrait
    ? perRow <= 3
      ? { w: 220, gap: 24, av: 120, pw: 132, ph: 76 }
      : perRow <= 4
        ? { w: 170, gap: 14, av: 104, pw: 118, ph: 70 }
        : { w: 140, gap: 6, av: 92, pw: 106, ph: 64 }
    : count <= 4
      ? { w: 210, gap: 34, av: 116, pw: 128, ph: 74 }
      : count <= 6
        ? { w: 170, gap: 18, av: 104, pw: 118, ph: 70 }
        : count <= 8
          ? { w: 138, gap: 10, av: 88, pw: 104, ph: 64 }
          : { w: 112, gap: 8, av: 84, pw: 92, ph: 56 };
  const spots = Array.from({ length: count }, (_, i) => {
    const row = oneRow || i < perRow ? 0 : 1;
    const j = row ? i - perRow : i;
    const inRow = row ? count - perRow : perRow;
    const cx = room.mid + (j - (inRow - 1) / 2) * (sz.w + sz.gap);
    const col = Math.max(0, Math.min(3, Math.floor(cx / room.colW)));
    const near = room.lights.reduce((a, b) =>
      Math.abs(b - cx) < Math.abs(a - cx) ? b : a,
    );
    return {
      row,
      col,
      dx: Math.round(Math.max(-24, Math.min(24, (cx - near) * 0.16)) + 6),
    };
  });
  return { sz, oneRow, perRow, rowSize: portrait ? perRow : count, spots };
}

/** The height chart's ruler, on the right edge of the window: each mark's number and ticks. */
export function Ruler({
  portrait,
  className,
}: {
  portrait: boolean;
  className: string;
}) {
  const room = roomOf(portrait);
  const r = room.ruler;
  const q =
    (r.lines[r.lines.length - 1] - r.lines[0]) / (r.lines.length - 1) / 4;
  const w = r.text + 3 * r.font;
  return (
    <svg
      className={className}
      width={w}
      height={room.h}
      viewBox={`0 0 ${w} ${room.h}`}
      aria-hidden="true"
    >
      {r.lines.map((line, i) => {
        const at = line - 2 * q;
        const fill = markColor(MARK_LIGHT[i]);
        const tick = (y: number, len: number) => (
          <rect
            x={w - len}
            y={y - r.thick / 2}
            width={len}
            height={r.thick}
            fill={fill}
          />
        );
        return (
          <g key={MARKS[i]}>
            {/* on its baseline, half a cap height under the tick, so the digits centre on it */}
            <text
              x={w - r.text}
              y={at + r.font * 0.35}
              fill={fill}
              fontSize={r.font}
              textAnchor="end"
            >
              {MARKS[i]}
            </text>
            {tick(at, r.major)}
            {tick(at + q, r.minor)}
            {tick(line + q, r.minor)}
          </g>
        );
      })}
    </svg>
  );
}
