import type { Rng } from "./engine";
import * as E from "./engine";

// Proposal A drawing kit: sticker creatures on a 100-unit canvas.

/** Where a pixel point sits on the 100-unit canvas. */
export type Pt = [number, number];
/** The head: an ellipse (centre y, half width, half height) and its top. */
export interface Head {
  cy: number;
  hw: number;
  r: number;
  T: number;
}
/** Eye height, half the distance between the eyes, mouth height. */
export interface FacePts {
  ey: number;
  ex: number;
  my: number;
}
/** A body colour and its family: shade, dark, light, inner (ears, cheeks). */
export interface Pal {
  b: string;
  s: string;
  d: string;
  l: string;
  i: string;
  dark: boolean;
}
/** A body: its outline pieces (unclosed svg tags), head, face points and what sits behind it. */
export interface Shape {
  parts: string[];
  h: Head;
  face: FacePts;
  back?: (pal: Pal) => string;
}
/** Svg drawn behind the body, and how high it reaches. */
export interface Reach {
  back: string;
  top: number;
}
/** The avatar's draws and its kit's free parameters (`p:key=value`). */
export interface Draws {
  u: Rng["u"];
  pick: Rng["pick"];
  p: Record<string, string>;
}
type Tri = [number, number, number];
interface EarSpec {
  th?: number;
  rot?: number;
  g?: string;
  in?: string;
  c?: Tri;
  ci?: Tri;
  el?: [number, number, number, number];
  eli?: [number, number, number, number];
  light?: 1;
  tuft?: 1;
  gills?: 1;
  elephant?: 1;
  claws?: 1;
  fins?: 1;
}

export const n = E.n1;
export const INK = "#1E2433";
export const SW = 2.4;
export const WH = "#FFFFFF";
export const TONGUE = "#F27C8E";
export const BLUSH = "#F38FAA";
export const BEAK = "#F6A43C";
export const GOLD = "#F2C14E";
export const BONE = "#F4EBD8";

export const C: Record<string, string> = {
  orange: "#F39A4C",
  ginger: "#E5803E",
  tan: "#D6A26B",
  brown: "#A06F4C",
  choc: "#6E4B37",
  caramel: "#C98B4E",
  cream: "#F6E7CC",
  bone: "#F3EAD6",
  white: "#FBF9F4",
  gray: "#AFB6C3",
  silver: "#CDD3DD",
  platinum: "#E3E7EE",
  slate: "#6E788A",
  charcoal: "#3E4556",
  black: "#2D3240",
  pink: "#F7B0C8",
  rose: "#EF84A5",
  red: "#E8574D",
  crimson: "#C93A45",
  coral: "#F48469",
  yellow: "#F8D35B",
  butter: "#F6E08A",
  gold: "#EDB637",
  bronze: "#C88A4E",
  lime: "#B6DB6F",
  green: "#6CC487",
  emerald: "#2FA67A",
  forest: "#3D8F62",
  olive: "#A2A65A",
  mint: "#A6E3C8",
  teal: "#3BB6A8",
  aqua: "#8BD8E8",
  sky: "#72B4F2",
  blue: "#4F86E0",
  navy: "#34476E",
  lilac: "#BCA4F2",
  purple: "#8F70DB",
  plum: "#8C4C8C",
  magenta: "#D46ECB",
  sand: "#EAD3A0",
  peach: "#F7C29E",
};
export const BLOB = [
  "sky",
  "lilac",
  "mint",
  "coral",
  "yellow",
  "teal",
  "pink",
  "lime",
  "orange",
  "blue",
  "purple",
  "aqua",
  "peach",
];

export const pal = (c: string): Pal => ({
  b: c,
  s: E.tone(c, -0.12, 0.02),
  d: E.tone(c, -0.3),
  l: E.mixc(c, WH, 0.62),
  i: E.mixc(c, "#F28BA8", 0.5),
  dark: E.lum(c) < 0.1,
});

// --- svg helpers ---
/** Sticker outline: a thick ink pass under the fill, so touching parts merge. */
export const OL = (geoms: string[], fill: string, more = "") => {
  let a = "";
  let b = "";
  for (const g of geoms) {
    a += `${g} fill="${INK}" stroke="${INK}" stroke-width="${SW * 2}" stroke-linejoin="round"/>`;
    b += `${g} fill="${fill}"${more}/>`;
  }
  return a + b;
};
export const F = (g: string, fill: string, more = "") =>
  `${g} fill="${fill}"${more}/>`;
export const L = (d: string, w = 2.4, c = INK, more = "") =>
  `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${more}/>`;
export const OLL = (d: string, w: number, c: string) =>
  L(d, w + SW * 1.7) + L(d, w, c);
export const T = (x: number, y: number, a = 0, s = 1) =>
  `translate(${n(x)} ${n(y)})${a ? ` rotate(${n(a)})` : ""}${s !== 1 ? ` scale(${Math.round(s * 1000) / 1000})` : ""}`;
export const G = (tr: string, body: string) =>
  `<g transform="${tr}">${body}</g>`;
export const MIR = (s: string) =>
  `${s}<g transform="matrix(-1 0 0 1 100 0)">${s}</g>`;
export const at = (h: Head, th: number): [number, number, number] => {
  const t = (th * Math.PI) / 180;
  return [50 - h.hw * Math.cos(t), h.cy - h.r * Math.sin(t), -(90 - th)];
};
export const P = (d: string) => `<path d="${d}"`;
export const Ci = (x: number, y: number, r: number) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"`;
export const El = (x: number, y: number, rx: number, ry: number, a = 0) =>
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}"${a ? ` transform="rotate(${a} ${n(x)} ${n(y)})"` : ""}`;
export const star = (
  x: number,
  y: number,
  r: number,
  k = 5,
  ir = 0.45,
  rot = -90,
) => {
  let d = "";
  for (let i = 0; i < k * 2; i++) {
    const rr = i % 2 ? r * ir : r;
    const a = ((rot + (i * 180) / k) * Math.PI) / 180;
    d += `${i ? "L" : "M"}${n(x + rr * Math.cos(a))} ${n(y + rr * Math.sin(a))}`;
  }
  return `${d}Z`;
};
export const spark = (x: number, y: number, r: number) =>
  `M${n(x)} ${n(y - r)}Q${n(x + r * 0.18)} ${n(y - r * 0.18)} ${n(x + r)} ${n(y)}Q${n(x + r * 0.18)} ${n(y + r * 0.18)} ${n(x)} ${n(y + r)}Q${n(x - r * 0.18)} ${n(y + r * 0.18)} ${n(x - r)} ${n(y)}Q${n(x - r * 0.18)} ${n(y - r * 0.18)} ${n(x)} ${n(y - r)}Z`;
export const heart = (x: number, y: number, s: number) =>
  `M${n(x)} ${n(y + 3.6 * s)}C${n(x - 6.4 * s)} ${n(y - 0.6 * s)} ${n(x - 3.4 * s)} ${n(y - 6 * s)} ${n(x)} ${n(y - 2.4 * s)}C${n(x + 3.4 * s)} ${n(y - 6 * s)} ${n(x + 6.4 * s)} ${n(y - 0.6 * s)} ${n(x)} ${n(y + 3.6 * s)}Z`;

// --- body shapes: geometry, head ellipse (for anchors and hats) and face points ---
function gum(hw: number, r: number, Tp: number, f: number): Shape {
  const cy = Tp + r;
  const l = 50 - hw;
  const R = 50 + hw;
  const d = `M${n(l - f)} 110C${n(l - f)} ${n(cy + 30)} ${l} ${n(cy + 14)} ${l} ${cy}A${hw} ${r} 0 0 1 ${R} ${cy}C${R} ${n(cy + 14)} ${n(R + f)} ${n(cy + 30)} ${n(R + f)} 110Z`;
  const ey = n(cy + r * 0.15);
  return {
    parts: [P(d)],
    h: { cy, hw, r, T: Tp },
    face: { ey, ex: n(hw * 0.37), my: n(ey + 10.5) },
  };
}
function catmull(pts: Pt[]) {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  const k = pts.length;
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % k];
    const p3 = pts[(i + 2) % k];
    d += `C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return `${d}Z`;
}
export const SHAPES: Record<string, (r: Rng) => Shape> = {
  gum: () => gum(28, 28, 24, 6),
  bean: () => gum(24, 25, 20, 4),
  wide: () => gum(34, 23, 32, 2),
  pear: () => gum(23, 23, 27, 14),
  round: () => ({
    parts: [Ci(50, 59, 30)],
    h: { cy: 59, hw: 30, r: 30, T: 29 },
    face: { ey: 60, ex: 11, my: 71 },
  }),
  square: () => ({
    parts: ['<rect x="22" y="27" width="56" height="86" rx="15"'],
    h: { cy: 52, hw: 28, r: 25, T: 27 },
    face: { ey: 56, ex: 10.5, my: 67 },
  }),
  tri: () => ({
    parts: [
      P("M43.6 25Q50 14 56.4 25L85 84Q91 102 74 108L26 108Q9 102 15 84Z"),
    ],
    h: { cy: 60, hw: 22, r: 40, T: 19 },
    face: { ey: 64, ex: 9.5, my: 75 },
  }),
  ghost: () => ({
    parts: [
      P(
        "M23 50A27 27 0 0 1 77 50L77 85Q70.3 94 63.5 85Q56.8 94 50 85Q43.2 94 36.5 85Q29.8 94 23 85Z",
      ),
    ],
    h: { cy: 50, hw: 27, r: 27, T: 23 },
    face: { ey: 54, ex: 10, my: 64.5 },
  }),
  tent: () => ({
    parts: [
      P(
        "M23 50A27 27 0 0 1 77 50L77 78Q79 92 71 92Q66 92 66 85Q62 96 56 92Q52 90 53 84Q50 97 47 84Q48 90 44 92Q38 96 34 85Q34 92 29 92Q21 92 23 78Z",
      ),
    ],
    h: { cy: 50, hw: 27, r: 27, T: 23 },
    face: { ey: 54, ex: 10, my: 64.5 },
  }),
  lumpy: (r) => {
    const pts: Pt[] = [];
    for (let k = 0; k < 9; k++) {
      const a = (k * 2 * Math.PI) / 9 - Math.PI / 2;
      const j = 1 + (r.u("lump", String(k)) - 0.5) * 0.13;
      pts.push([50 + 31 * Math.cos(a) * j, 64 + 35 * Math.sin(a) * j]);
    }
    return {
      parts: [P(catmull(pts))],
      h: { cy: 58, hw: 30, r: 30, T: 29 },
      face: { ey: 60, ex: 11, my: 71 },
    };
  },
  jelly: () => ({
    parts: [
      P(
        "M22 54C22 30 36 20 50 20C64 20 78 30 78 54Q74 61 68.6 55.4Q64 62 59.2 55.4Q54.6 62 50 55.4Q45.4 62 40.8 55.4Q36 62 31.4 55.4Q26 61 22 54Z",
      ),
    ],
    h: { cy: 46, hw: 28, r: 26, T: 20 },
    face: { ey: 41, ex: 9.4, my: 49.6 },
    back: (pal) =>
      [32, 68]
        .map((x) =>
          OLL(`M${x} 56Q${x - 5} 66 ${x} 76Q${x + 5} 86 ${x} 98`, 2.2, pal.s),
        )
        .join("") +
      [41, 59]
        .map((x) =>
          OLL(`M${x} 56Q${x + 4} 64 ${x} 72Q${x - 4} 80 ${x} 88`, 2.2, pal.s),
        )
        .join("") +
      OL([P("M45 54Q39 64 46 72Q52 80 45 92Q53 86 52 76Q50 66 55 56Z")], pal.l),
  }),
  ball: () => ({
    parts: [Ci(50, 63, 26)],
    h: { cy: 63, hw: 26, r: 26, T: 37 },
    face: { ey: 64, ex: 9.6, my: 74 },
  }),
  cupcake: () => ({
    parts: [P("M23.4 61Q22.6 58 26 58L74 58Q77.4 58 76.6 61L71 112L29 112Z")],
    h: { cy: 44, hw: 26, r: 24, T: 18 },
    face: { ey: 75, ex: 9.6, my: 85 },
  }),
  fluffy: () => {
    const b = gum(27, 27, 27, 5);
    const { cy, hw, r } = b.h;
    for (let k = 0; k <= 8; k++) {
      const a = (k * Math.PI) / 8;
      b.parts.push(
        Ci(50 - (hw + 0.5) * Math.cos(a), cy - (r + 0.5) * Math.sin(a), 8.6),
      );
    }
    b.parts.push(Ci(50 - hw - 1, cy + 11, 8), Ci(50 + hw + 1, cy + 11, 8));
    return b;
  },
  // objects and foods with their own silhouette
  funnel: () => ({
    parts: [
      P(
        "M12 30Q50 16 88 30Q84 46 72 58Q64 70 58 82Q54 92 50 106Q46 92 42 82Q36 70 28 58Q16 46 12 30Z",
      ),
    ],
    h: { cy: 44, hw: 32, r: 18, T: 24 },
    face: { ey: 42, ex: 9.6, my: 52 },
  }),
  gem: () => ({
    parts: [P("M50 12L79 33L68 95L32 95L21 33Z")],
    h: { cy: 46, hw: 26, r: 26, T: 16 },
    face: { ey: 50, ex: 9.6, my: 61 },
  }),
  brocco: () => ({
    parts: [P("M38 58L62 58L68 112L32 112Z")],
    h: { cy: 38, hw: 30, r: 24, T: 12 },
    face: { ey: 39, ex: 9.6, my: 49 },
  }),
  bonsai: () => ({
    parts: [
      '<rect x="21" y="66" width="58" height="11" rx="4"',
      P("M26 75L74 75L69 112L31 112Z"),
    ],
    h: { cy: 34, hw: 30, r: 22, T: 12 },
    face: { ey: 35, ex: 9.6, my: 45 },
    back: () =>
      OLL("M50 72C50 62 42 58 44 48C45 42 52 40 54 34", 6, "#8C5E3C") +
      OLL("M45 52C38 50 34 46 33 42", 3.6, "#8C5E3C"),
  }),
  crescent: () => ({
    parts: [
      P(
        "M8 74C8 44 28 27 50 27C72 27 92 44 92 74C86 67 80 66 74 69C68 59 60 56 50 57C40 56 32 59 26 69C20 66 14 67 8 74Z",
      ),
    ],
    h: { cy: 44, hw: 32, r: 17, T: 27 },
    face: { ey: 39, ex: 9.4, my: 48 },
  }),
  jello: () => ({
    parts: [P("M24 88L28 43Q30 33 40 33L60 33Q70 33 72 43L76 88Z")],
    h: { cy: 50, hw: 24, r: 18, T: 33 },
    face: { ey: 57, ex: 9, my: 67 },
    back: () => OL([El(50, 89, 37, 6.4)], WH),
  }),
  ring: () => ({
    parts: [
      '<path fill-rule="evenodd" clip-rule="evenodd" d="M50 26A32 32 0 1 1 49.99 26ZM50 61.5A9 9 0 1 0 50.01 61.5Z"',
    ],
    h: { cy: 58, hw: 32, r: 32, T: 26 },
    face: { ey: 46, ex: 10.4, my: 55 },
  }),
  cup: () => ({
    parts: [P("M25 46L75 46L70 112L30 112Z")],
    h: { cy: 36, hw: 26, r: 12, T: 24 },
    face: { ey: 61, ex: 9.6, my: 71 },
  }),
  taco: () => ({
    parts: [P("M9 50A41 41 0 0 0 91 50Z")],
    h: { cy: 50, hw: 40, r: 10, T: 40 },
    face: { ey: 63, ex: 10, my: 73 },
  }),
  halfmoon: () => ({
    parts: [P("M9 78A41 41 0 0 1 91 78Z")],
    h: { cy: 56, hw: 38, r: 30, T: 37 },
    face: { ey: 58, ex: 10, my: 68 },
  }),
  sole: () => ({
    parts: ['<rect x="26" y="10" width="48" height="104" rx="24"'],
    h: { cy: 40, hw: 24, r: 30, T: 10 },
    face: { ey: 72, ex: 9.4, my: 82 },
  }),
  bowl: () => ({
    parts: [P("M12 55L88 55Q88 93 50 97Q12 93 12 55Z")],
    h: { cy: 44, hw: 34, r: 12, T: 32 },
    face: { ey: 68, ex: 10, my: 78 },
  }),
};

// --- ears: drawn behind the body, one side then mirrored ---
const EARS: Record<string, EarSpec> = {
  cat: {
    th: 58,
    g: "M-11 7L-3.6-17Q0-23 3.6-17L11 7Z",
    in: "M-6 5L-1.6-9.5Q0-12.5 1.6-9.5L6 5Z",
  },
  fox: {
    th: 60,
    g: "M-12 7L-3-25Q0-30 3-25L12 7Z",
    in: "M-6.5 5L-1.4-14Q0-17 1.4-14L6.5 5Z",
  },
  big: {
    th: 50,
    rot: -6,
    g: "M-14 9L-4-31Q0-36 4-31L14 9Z",
    in: "M-8 6L-1.8-20Q0-23 1.8-20L8 6Z",
  },
  lynx: {
    th: 60,
    g: "M-11 7L-3.6-17Q0-23 3.6-17L11 7Z",
    in: "M-6 5L-1.6-9.5Q0-12.5 1.6-9.5L6 5Z",
    tuft: 1,
  },
  bear: { th: 62, c: [0, -3, 10], ci: [0, -2, 5.5] },
  koala: { th: 50, c: [0, -4, 13], ci: [0, -3, 8], light: 1 },
  mouse: { th: 50, c: [0, -7, 15.5], ci: [0, -6, 9.5] },
  small: { th: 66, c: [0, -1, 6.5] },
  bunny: { th: 73, rot: 7, el: [0, -17, 7.5, 20], eli: [0, -15, 3.6, 13.5] },
  tuft: { th: 60, g: "M-8 7L-1.5-14Q0-17 1.5-14L8 7Z" },
  pig: {
    th: 60,
    g: "M-10 7L-6-11Q-4.5-15-1.6-11.6L11 4Z",
    in: "M-6 3L-4.4-6.6L3 1.6Z",
  },
  bat: {
    th: 52,
    rot: -14,
    g: "M-13 9L-11-27Q-10-31-7-27.5L13 5Z",
    in: "M-7 5L-7.4-15L5 3Z",
  },
  elf: {
    th: 22,
    rot: 26,
    g: "M-5.6 7L-1.4-19Q0-21.6 1.4-19L6.4 7Z",
    in: "M-2.4 4L-0.5-11L2.4 4Z",
  },
  gills: { gills: 1 },
  elephant: { elephant: 1 },
  claws: { claws: 1 },
  fishfins: { fins: 1 },
};
export function ears(
  kind: string,
  h: Head,
  pal: Pal,
  earCol?: string | null,
): Reach {
  const e = EARS[kind];
  if (!e) return { back: "", top: 99 };
  const col = earCol || pal.b;
  if (e.gills) {
    let s = "";
    for (const [th, len] of [
      [30, 12],
      [52, 14],
      [74, 11],
    ]) {
      const [x, y, a] = at(h, th);
      s += G(
        T(x, y, a - 8),
        OL([El(0, -len / 2, 3.4, len / 2 + 1)], E.tone(col, -0.08)),
      );
    }
    return { back: MIR(s), top: h.cy - h.r - 10 };
  }
  if (e.elephant) {
    const s = G(
      T(50 - h.hw + 4, h.cy - 4),
      OL([P("M2-12C-14-18-24-6-22 8C-20 20-8 22 0 12Z")], col) +
        F(P("M-3-7C-12-10-17-2-16 6C-15 13-8 14-3 8Z"), pal.i),
    );
    return { back: MIR(s), top: h.cy - 22 };
  }
  if (e.claws) {
    const s = G(
      T(50 - h.hw - 2, h.cy + 2, -22),
      OL(
        [P("M4 6C-8 8-14-2-12-12C-11-18-6-20-3-17L-6-10L1-12C2-6 6-2 4 6Z")],
        col,
      ),
    );
    return { back: MIR(s), top: h.cy - 22 };
  }
  if (e.fins) {
    const s = G(
      T(50 - h.hw + 2, h.cy + 8, -30),
      OL([P("M4 4C-6 2-14-4-17-13C-9-12-2-9 5-4Z")], pal.s),
    );
    return { back: MIR(s), top: h.cy - 10 };
  }
  const [x, y, a] = at(h, e.th ?? 0);
  let g = "";
  let inner = "";
  let reach = 26;
  if (e.g) {
    g = OL([P(e.g)], col);
    inner = e.in ? F(P(e.in), kind === "fox" ? WH : pal.i) : "";
    reach = kind === "big" ? 34 : kind === "fox" || kind === "bat" ? 28 : 20;
  } else if (e.c) {
    g = OL([Ci(...e.c)], col);
    inner = e.ci ? F(Ci(...e.ci), e.light ? E.mixc(col, WH, 0.55) : pal.i) : "";
    reach = -e.c[1] + e.c[2];
  } else if (e.el) {
    g = OL([El(...e.el)], col);
    inner = e.eli ? F(El(...e.eli), pal.i) : "";
    reach = 37;
  }
  if (e.tuft) inner += L("M0-20L0-27", 2.2);
  const s = G(T(x, y, a + (e.rot || 0)), g + inner);
  return { back: MIR(s), top: y - reach };
}

// --- horns, antennae and other things on top of the head (behind the body) ---
export function horns(kind: string, h: Head): Reach {
  let s = "";
  let top = 99;
  if (kind === "goat") {
    const [x, y, a] = at(h, 70);
    s = MIR(
      G(T(x, y, a - 10), OL([P("M-4 6C-6-6-3-16 6-22C2-14 2-4 5 6Z")], BONE)),
    );
    top = y - 22;
  } else if (kind === "bull") {
    const [x, y] = at(h, 46);
    s = MIR(
      G(T(x + 2, y + 2), OL([P("M4 4C-6 2-14-4-15-17C-9-10-2-8 6-5Z")], BONE)),
    );
    top = y - 16;
  } else if (kind === "oni") {
    const [x, y, a] = at(h, 66);
    s = MIR(G(T(x, y, a + 8), OL([P("M-5 6L-1-12Q1-15 3-12L6 6Z")], GOLD)));
    top = y - 14;
  } else if (kind === "dragon") {
    const [x, y, a] = at(h, 64);
    s = MIR(
      G(T(x, y, a), OL([P("M-4 6C-4-6-10-14-17-19C-10-11-3-3 6 4Z")], BONE)),
    );
    top = y - 19;
  } else if (kind === "antlers") {
    const [x, y, a] = at(h, 68);
    s = MIR(
      G(
        T(x, y, a - 6),
        OLL("M0 6L-1-14M-1-5L-9-11M-1-14L-7-21M-1-14L3-22", 3.4, "#B5835A"),
      ),
    );
    top = y - 23;
  } else if (kind === "ossicone") {
    const [x, y, a] = at(h, 72);
    s = MIR(
      G(
        T(x, y, a),
        OLL("M0 6L0-10", 3.6, "#C98B4E") + OL([Ci(0, -11, 3.8)], "#8C5E3C"),
      ),
    );
    top = y - 15;
  } else if (kind === "beetle") {
    s = G(
      T(50, h.T + 3),
      OL([P("M-4 4Q-4-10 0-16Q2-12 6-14Q4-8 4 4Z")], E.tone("#3E4556", 0.08)),
    );
    top = h.T - 16;
  }
  return { back: s, top };
}
export function antennae(
  kind: string,
  h: Head,
  pal: Pal,
): Reach & { eyes?: Pt[] } {
  let s = "";
  let top = 99;
  if (kind === "bug" || kind === "long") {
    const [x, y, a] = at(h, 72);
    const tall = kind === "long" ? 1.5 : 1;
    s = MIR(
      G(
        T(x, y, a + 4),
        L(`M0 6C0-6-5-${12 * tall}-9-${17 * tall}`, 2.4) +
          (kind === "bug" ? OL([Ci(-9, -17, 3.6)], pal.d) : ""),
      ),
    );
    top = y - 22 * tall;
  } else if (kind === "alien") {
    const [x, y, a] = at(h, 70);
    s = MIR(
      G(T(x, y, a), L("M0 6L0-12", 2.4) + OL([Ci(0, -15, 4.2)], "#F6E27A")),
    );
    top = y - 20;
  } else if (kind === "robot") {
    s =
      L(`M50 ${h.T + 4}L50 ${h.T - 9}`, 2.6) +
      OL([Ci(50, h.T - 11, 3.8)], "#E8574D");
    top = h.T - 15;
  } else if (kind === "feelers") {
    const [x, y, a] = at(h, 78);
    s = MIR(G(T(x, y, a), L("M0 6C-2-8-10-16-22-18", 2)));
    top = y - 18;
  } else if (kind === "stalks") {
    // only the stalks: the eyes on top are drawn with the face, so they follow the expression
    const [x, y] = at(h, 66);
    s = MIR(
      L(`M${n(x + 2)} ${n(y + 6)}L${n(x - 1)} ${n(y - 9)}`, 3.2 + SW * 1.7) +
        L(`M${n(x + 2)} ${n(y + 6)}L${n(x - 1)} ${n(y - 9)}`, 3.2, pal.b),
    );
    top = y - 19;
    return {
      back: s,
      top,
      eyes: [
        [n(x - 1), n(y - 12)],
        [n(101 - x), n(y - 12)],
      ],
    };
  }
  return { back: s, top };
}

/** Tops of the objects and foods: fillings, florets, frostings. */
const TOPS: Record<
  string,
  (h: Head, pal: Pal, r: Draws) => Partial<Reach & { front: string }>
> = {
  florets: () => ({
    front:
      OL(
        [
          Ci(31, 44, 12.6),
          Ci(50, 36, 15.4),
          Ci(69, 44, 12.6),
          Ci(39, 25, 11),
          Ci(61, 25, 11),
          Ci(50, 50, 11),
        ],
        "#3D8F62",
      ) +
      [
        [36, 30],
        [58, 22],
        [70, 38],
        [28, 48],
        [62, 50],
        [44, 18],
      ]
        .map(([x, y]) => F(Ci(x, y, 1.6), "#2C7550"))
        .join(""),
    top: 12,
  }),
  bonsaitree: () => ({
    front: OL(
      [
        Ci(50, 34, 16),
        Ci(33, 41, 10.4),
        Ci(67, 41, 10.4),
        Ci(41, 22, 9.4),
        Ci(59, 22, 9.4),
      ],
      "#5DB879",
    ),
    top: 11,
  }),
  cream: () => ({
    front:
      OL([Ci(40, 33, 6.4), Ci(60, 33, 6.4), Ci(50, 29, 7.6)], WH) +
      L("M56 18Q58 12 62 11", 1.6) +
      OL([Ci(51, 21, 4.6)], "#E8574D") +
      F(El(49.6, 19.4, 1.3, 0.9), WH),
    top: 10,
  }),
  ringfrost: (_h, _pal, r) => {
    const col = r.pick("frost", [
      "#F49AB4",
      "#8C5E3C",
      "#BCA4F2",
      "#A6E3C8",
      "#F6EEDC",
    ]);
    let d = "";
    const pts: Pt[] = [];
    for (let k = 0; k < 24; k++) {
      const a = (k * 15 * Math.PI) / 180;
      const drip = Math.sin(a) > 0.25 && k % 2 ? 4.4 : 0;
      const rr = 27 + drip;
      pts.push([50 + rr * Math.cos(a), 58 + rr * Math.sin(a)]);
    }
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k];
      const q = pts[(k + 1) % pts.length];
      if (!k) d += `M${n((p[0] + q[0]) / 2)} ${n((p[1] + q[1]) / 2)}`;
      const nn = pts[(k + 2) % pts.length];
      d += `Q${n(q[0])} ${n(q[1])} ${n((q[0] + nn[0]) / 2)} ${n((q[1] + nn[1]) / 2)}`;
    }
    d += "ZM50 58.6A11.4 11.4 0 1 0 50.01 58.6Z";
    const sp = ["#F8D35B", "#72B4F2", "#FFFFFF", "#6CC487", "#E8574D"];
    let s = OL([`<path fill-rule="evenodd" d="${d}"`], col);
    [
      [33, 46, 30],
      [64, 44, -40],
      [70, 62, 60],
      [30, 64, -20],
      [44, 38, 70],
      [58, 38, -10],
      [38, 80, 40],
      [62, 80, -50],
    ].forEach(([x, y, a], i) => {
      s += G(
        `rotate(${a} ${x} ${y})`,
        F(
          `<rect x="${x - 2.2}" y="${y - 0.8}" width="4.4" height="1.6" rx=".8"`,
          sp[i % 5],
        ),
      );
    });
    return { front: s, top: 26 };
  },
  cupnoodles: () => ({
    back:
      OL(
        [P("M25 48Q26 33 36 35Q40 27 50 31Q58 25 64 33Q74 31 75 48Z")],
        "#F4DC8E",
      ) +
      L("M32 40Q36 37 40 40T48 40T56 40T64 40", 1.6, "#D9B55A") +
      OLL("M60 36L86 10", 2.6, "#C98B4E") +
      OLL("M64 38L90 14", 2.6, "#C98B4E"),
    front: OL(['<rect x="22" y="42" width="56" height="8" rx="3"'], WH),
    top: 9,
  }),
  tacofill: () => ({
    back:
      OL(
        [
          P(
            "M8 52Q12 40 20 46Q24 36 32 44Q38 34 46 42Q52 34 58 42Q64 34 70 44Q78 36 82 46Q90 42 92 52Z",
          ),
        ],
        "#7CC46A",
      ) +
      OL([Ci(30, 45, 4.6), Ci(54, 43, 4.6), Ci(72, 46, 4)], "#E8574D") +
      OL([Ci(42, 47, 4), Ci(64, 48, 3.6)], "#8C5E3C"),
    top: 34,
  }),
  tapfill: (_h, _pal, r) => {
    const col = r.pick("fill", ["#F8D35B", "#F49AB4", "#8C5E3C", "#FBF9F4"]);
    return {
      back: OL(
        [
          P(
            "M10 74Q18 88 26 81Q34 90 42 81Q50 90 58 81Q66 90 74 81Q82 88 90 74Z",
          ),
        ],
        col,
      ),
      front: L("M20 62Q50 50 80 62", 1.6, "#E3DCCB"),
      top: 36,
    };
  },
  strap: (_h, _pal, r) => {
    const col = r.pick("strap", ["#FFFFFF", "#34476E", "#F8D35B", "#E8574D"]);
    return {
      front:
        OLL("M50 26Q36 32 26.6 60M50 26Q64 32 73.4 60", 6, col) +
        OL([Ci(50, 26, 4)], col),
      top: 10,
    };
  },
  ramen: () => ({
    back:
      OL(
        [P("M15 57Q17 40 31 42Q37 31 50 35Q61 29 69 39Q83 40 85 57Z")],
        "#F4DC8E",
      ) +
      L(
        "M24 50Q28 46 32 50T40 50T48 50M52 46Q56 42 60 46T68 46T76 46",
        1.6,
        "#D9B55A",
      ) +
      OL([El(66, 43, 7.6, 6)], WH) +
      F(Ci(66, 44, 3.4), "#F6B33C") +
      OL([Ci(36, 44, 6.4)], WH) +
      L(
        "M36 44m-1 0a1.2 1.2 0 0 1 2.4 0a2.6 2.6 0 0 1-5.2 0a3.8 3.8 0 0 1 7.6 0",
        1.2,
        "#EF7FA2",
      ) +
      OLL("M54 40L82 8", 2.6, "#C98B4E") +
      OLL("M58 42L88 12", 2.6, "#C98B4E"),
    top: 6,
  }),
  ukeneck: (h) => ({
    back:
      OL(
        [
          `<rect x="45.6" y="${h.T - 24}" width="8.8" height="34" rx="2"`,
          `<rect x="43" y="${h.T - 32}" width="14" height="10" rx="3"`,
        ],
        "#8C5E3C",
      ) +
      F(Ci(41.6, h.T - 29, 1.8), "#F2C14E") +
      F(Ci(58.4, h.T - 29, 1.8), "#F2C14E") +
      F(Ci(41.6, h.T - 25, 1.8), "#F2C14E") +
      F(Ci(58.4, h.T - 25, 1.8), "#F2C14E"),
    top: h.T - 33,
  }),
  softfin: (h, pal) => ({
    back:
      OL(
        [
          P(
            `M38 ${h.T + 8}Q40 ${h.T - 8} 50 ${h.T - 11}Q60 ${h.T - 8} 62 ${h.T + 8}Z`,
          ),
        ],
        pal.s,
      ) +
      L(
        `M44 ${h.T}L45 ${h.T - 6}M50 ${h.T - 1}L50 ${h.T - 8}M56 ${h.T}L55 ${h.T - 6}`,
        1.4,
        pal.d,
      ),
    top: h.T - 11,
  }),
};

// Top features: crests, plants, caps. Each returns back/front svg and how high it reaches.
export function top(
  kind: string,
  h: Head,
  pal: Pal,
  r: Draws,
): Reach & { front: string } {
  const Tp = h.T;
  const c = 50;
  const extra = TOPS[kind];
  if (extra) {
    const o = extra(h, pal, r);
    return { back: o.back ?? "", front: o.front ?? "", top: o.top ?? 99 };
  }
  const o = { back: "", front: "", top: 99 };
  switch (kind) {
    case "mane": {
      const col = E.tone(pal.b, -0.14, 0.05);
      const ps = [];
      for (let k = 0; k < 14; k++) {
        const a = (k * 2 * Math.PI) / 14;
        ps.push(
          Ci(
            c + (h.hw + 3) * Math.cos(a),
            h.cy + 4 + (h.r + 3) * Math.sin(a),
            9,
          ),
        );
      }
      o.back = OL(ps, col);
      o.top = h.cy - h.r - 12;
      break;
    }
    case "petals": {
      let s = "";
      for (let k = 0; k < 12; k++) {
        const a = (k * 360) / 12;
        s += G(
          `rotate(${a} 50 ${h.cy})`,
          OL([El(50, h.cy - h.r - 6, 6.4, 11)], "#F7C948"),
        );
      }
      o.back = s;
      o.top = h.cy - h.r - 17;
      break;
    }
    case "crest":
      o.back = [-24, 0, 24]
        .map((a) =>
          G(
            `rotate(${a} 50 ${Tp + 6})`,
            OL([El(50, Tp - 6, 3.6, 10)], a ? pal.s : pal.d),
          ),
        )
        .join("");
      o.top = Tp - 16;
      break;
    case "comb":
      o.back = OL(
        [Ci(44, Tp - 1, 5.4), Ci(50, Tp - 4, 6), Ci(56, Tp - 1, 5.4)],
        "#E8574D",
      );
      o.top = Tp - 10;
      break;
    case "tuft":
      o.front = L(
        `M49 ${Tp + 2}C47 ${Tp - 6} 44 ${Tp - 8} 41 ${Tp - 7}M51 ${Tp + 2}C51 ${Tp - 7} 54 ${Tp - 10} 57 ${Tp - 9}`,
        2.4,
      );
      o.top = Tp - 10;
      break;
    case "plume":
      o.front =
        OLL(
          `M50 ${Tp + 2}C50 ${Tp - 6} 54 ${Tp - 12} 60 ${Tp - 11}`,
          2.2,
          INK,
        ) + OL([Ci(60, Tp - 12, 3.2)], pal.d);
      o.top = Tp - 15;
      break;
    case "peacock": {
      let s = "";
      for (const a of [-36, -18, 0, 18, 36]) {
        s += G(
          `rotate(${a} 50 ${Tp + 8})`,
          L(`M50 ${Tp + 6}L50 ${Tp - 12}`, 1.8) +
            OL([El(50, Tp - 14, 3.8, 5)], "#3BB6A8") +
            F(Ci(50, Tp - 14, 1.8), "#34476E"),
        );
      }
      o.back = s;
      o.top = Tp - 19;
      break;
    }
    case "flame":
      o.back =
        OL(
          [
            P(
              `M38 ${Tp + 10}C34 ${Tp - 2} 42 ${Tp - 6} 44 ${Tp - 14}C47 ${Tp - 8} 48 ${Tp - 6} 50 ${Tp - 20}C53 ${Tp - 8} 56 ${Tp - 10} 58 ${Tp - 15}C61 ${Tp - 6} 66 ${Tp} 62 ${Tp + 10}Z`,
            ),
          ],
          "#F59A3C",
        ) +
        F(
          P(
            `M44 ${Tp + 8}C42 ${Tp} 46 ${Tp - 2} 47 ${Tp - 7}C49 ${Tp - 2} 51 ${Tp - 4} 52 ${Tp - 9}C54 ${Tp - 2} 58 ${Tp + 2} 56 ${Tp + 8}Z`,
          ),
          "#F8D35B",
        );
      o.top = Tp - 20;
      break;
    case "mohawk": {
      let d = `M42 ${Tp + 8}`;
      const xs = [42, 44.5, 47, 50, 53, 55.5, 58];
      const ys = [Tp - 6, Tp - 1, Tp - 11, Tp - 2, Tp - 11, Tp - 1, Tp - 6];
      for (let i = 0; i < 7; i++) d += `L${xs[i]} ${ys[i]}`;
      d += `L58 ${Tp + 8}Z`;
      o.back = OL([P(d)], r.p.punk ? "#D46ECB" : pal.d);
      o.top = Tp - 11;
      break;
    }
    case "forelock":
      o.front = OL(
        [
          P(
            `M40 ${Tp + 4}C42 ${Tp - 4} 52 ${Tp - 6} 58 ${Tp - 1}C56 ${Tp + 4} 50 ${Tp + 10} 44 ${Tp + 12}C46 ${Tp + 8} 46 ${Tp + 5} 40 ${Tp + 4}Z`,
          ),
        ],
        pal.d,
      );
      o.top = Tp - 6;
      break;
    case "unihorn":
      o.back =
        OL([P(`M45.5 ${Tp + 4}L50 ${Tp - 20}L54.5 ${Tp + 4}Z`)], "#F6DD8A") +
        L(`M46.8 ${Tp - 2}L53.4 ${Tp - 4}M47.8 ${Tp - 8}L52.4 ${Tp - 10}`, 1.6);
      o.top = Tp - 22;
      break;
    case "tusk":
      o.back =
        OL([P(`M47.6 ${Tp + 4}L50 ${Tp - 22}L52.4 ${Tp + 4}Z`)], BONE) +
        L(`M48.6 ${Tp - 2}L51.4 ${Tp - 4}M49 ${Tp - 9}L51 ${Tp - 11}`, 1.4);
      o.top = Tp - 23;
      break;
    case "fin":
      o.back = OL(
        [
          P(
            `M41 ${Tp + 8}C44 ${Tp - 6} 53 ${Tp - 14} 62 ${Tp - 16}C58 ${Tp - 6} 58 ${Tp} 60 ${Tp + 8}Z`,
          ),
        ],
        pal.s,
      );
      o.top = Tp - 16;
      break;
    case "spikes": {
      const ps = [];
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI + (k * Math.PI) / 10;
        const x = 50 + h.hw * Math.cos(a);
        const y = h.cy + h.r * Math.sin(a);
        const ox = Math.cos(a);
        const oy = Math.sin(a);
        ps.push(
          P(
            `M${n(x - oy * 6)} ${n(y + ox * 6)}L${n(x + ox * 11)} ${n(y + oy * 11)}L${n(x + oy * 6)} ${n(y - ox * 6)}Z`,
          ),
        );
      }
      o.back = OL(ps, pal.d);
      o.top = h.cy - h.r - 11;
      break;
    }
    case "puffspikes": {
      let s = "";
      for (let k = 0; k < 16; k++) {
        const a = (k * 2 * Math.PI) / 16;
        const x = 50 + (h.hw + 1) * Math.cos(a);
        const y = h.cy + (h.r + 1) * Math.sin(a);
        s += L(
          `M${n(x)} ${n(y)}L${n(x + Math.cos(a) * 6)} ${n(y + Math.sin(a) * 6)}`,
          2.4,
        );
      }
      o.back = s;
      o.top = h.cy - h.r - 7;
      break;
    }
    case "ridge":
      o.back = OL(
        [
          P(
            `M40 ${Tp + 6}L43 ${Tp - 6}L47 ${Tp + 2}L50 ${Tp - 10}L53 ${Tp + 2}L57 ${Tp - 6}L60 ${Tp + 6}Z`,
          ),
        ],
        r.p.ridgeCol || "#F2C14E",
      );
      o.top = Tp - 10;
      break;
    case "chamcrest":
      o.back = OL(
        [
          P(
            `M40 ${Tp + 8}C40 ${Tp - 6} 56 ${Tp - 10} 60 ${Tp + 2}C54 ${Tp - 2} 48 ${Tp + 2} 46 ${Tp + 10}Z`,
          ),
        ],
        pal.s,
      );
      o.top = Tp - 8;
      break;
    case "fluff":
      o.front = OL(
        [Ci(42.5, Tp + 3, 6.6), Ci(50, Tp - 1, 7.6), Ci(57.5, Tp + 3, 6.6)],
        E.mixc(pal.b, WH, 0.35),
      );
      o.top = Tp - 9;
      break;
    case "sprout":
      o.back =
        L(`M50 ${Tp + 4}L50 ${Tp - 6}`, 2.6, INK) +
        OL(
          [
            P(
              `M50 ${Tp - 5}C44 ${Tp - 4} 40 ${Tp - 10} 40 ${Tp - 15}C46 ${Tp - 15} 50 ${Tp - 11} 50 ${Tp - 5}Z`,
            ),
            P(
              `M50 ${Tp - 5}C56 ${Tp - 4} 60 ${Tp - 10} 60 ${Tp - 15}C54 ${Tp - 15} 50 ${Tp - 11} 50 ${Tp - 5}Z`,
            ),
          ],
          "#6CC487",
        );
      o.top = Tp - 16;
      break;
    case "leaf":
      o.back =
        L(`M50 ${Tp + 4}L50 ${Tp - 5}`, 2.6, INK) +
        OL(
          [
            P(
              `M50 ${Tp - 4}C54 ${Tp - 4} 60 ${Tp - 8} 61 ${Tp - 13}C55 ${Tp - 14} 50 ${Tp - 10} 50 ${Tp - 4}Z`,
            ),
          ],
          "#6CC487",
        );
      o.top = Tp - 14;
      break;
    case "leafcrown": {
      let s = "";
      for (const a of [-40, -20, 0, 20, 40]) {
        s += G(
          `rotate(${a} 50 ${Tp + 6})`,
          OL(
            [
              P(
                `M46.5 ${Tp + 6}Q47 ${Tp - 8} 50 ${Tp - 16}Q53 ${Tp - 8} 53.5 ${Tp + 6}Z`,
              ),
            ],
            a % 40 ? "#3D8F62" : "#6CC487",
          ),
        );
      }
      o.back = s;
      o.top = Tp - 17;
      break;
    }
    case "fronds": {
      let s = "";
      for (const a of [-22, 0, 22])
        s += G(
          `rotate(${a} 50 ${Tp + 6})`,
          OL([El(50, Tp - 6, 4, 12)], "#6CC487"),
        );
      o.back = s;
      o.top = Tp - 18;
      break;
    }
    case "calyx": {
      let d = "";
      for (let k = 0; k < 5; k++) {
        const a = ((-90 + k * 72) * Math.PI) / 180;
        const a2 = ((-90 + k * 72 + 36) * Math.PI) / 180;
        d += `${k ? "L" : "M"}${n(50 + 13 * Math.cos(a))} ${n(Tp + 5 + 6 * Math.sin(a))}L${n(50 + 4 * Math.cos(a2))} ${n(Tp + 5 + 2.4 * Math.sin(a2))}`;
      }
      o.front =
        OL([P(`${d}Z`)], "#5DB879") + L(`M50 ${Tp + 3}L51 ${Tp - 5}`, 2.6);
      o.top = Tp - 6;
      break;
    }
    case "stem":
      o.back =
        OLL(`M50 ${Tp + 4}Q50 ${Tp - 4} 54 ${Tp - 8}`, 3.4, "#8C5E3C") +
        OL(
          [
            P(
              `M52 ${Tp - 3}C56 ${Tp - 4} 61 ${Tp - 6} 63 ${Tp - 11}C57 ${Tp - 12} 53 ${Tp - 8} 52 ${Tp - 3}Z`,
            ),
          ],
          "#6CC487",
        );
      o.top = Tp - 12;
      break;
    case "flower":
      o.back =
        OL(
          [
            Ci(46, Tp - 2, 3.6),
            Ci(54, Tp - 2, 3.6),
            Ci(50, Tp - 6.5, 3.6),
            Ci(50, Tp + 2, 3.6),
          ],
          "#F49AB4",
        ) + F(Ci(50, Tp - 2, 2.4), "#F8D35B");
      o.top = Tp - 10;
      break;
    case "mushcap": {
      const y0 = Tp + 14;
      o.front =
        OL(
          [
            P(
              `M15 ${y0}C15 ${y0 - 34} 85 ${y0 - 34} 85 ${y0}C70 ${y0 + 5} 30 ${y0 + 5} 15 ${y0}Z`,
            ),
          ],
          r.p.capCol || "#E8574D",
        ) +
        F(Ci(34, y0 - 12, 4.4), WH) +
        F(Ci(56, y0 - 19, 5.2), WH) +
        F(Ci(71, y0 - 7, 3.4), WH) +
        F(Ci(46, y0 - 3, 2.6), WH);
      o.top = y0 - 26;
      break;
    }
    case "acorncap": {
      const y0 = Tp + 12;
      o.front =
        OL(
          [
            P(
              `M17 ${y0}C17 ${y0 - 26} 83 ${y0 - 26} 83 ${y0}C66 ${y0 + 4} 34 ${y0 + 4} 17 ${y0}Z`,
            ),
          ],
          "#8C5E3C",
        ) +
        L(
          `M30 ${y0 - 14}L42 ${y0 + 1}M44 ${y0 - 19}L56 ${y0 + 2}M58 ${y0 - 19}L68 ${y0 - 2}M30 ${y0 - 2}L44 ${y0 - 18}M44 ${y0 + 1}L58 ${y0 - 19}M58 ${y0 + 2}L71 ${y0 - 13}`,
          1.4,
          E.tone("#8C5E3C", -0.12),
        ) +
        OLL(`M50 ${y0 - 19}L51 ${y0 - 26}`, 3, "#8C5E3C");
      o.top = y0 - 28;
      break;
    }
    case "frosting":
    case "frostswirl": {
      const y0 = Tp + 15;
      const col = r.p.frost || "#F49AB4";
      o.front = OL(
        [
          P(
            `M${50 - h.hw - 1} ${y0}C${50 - h.hw - 1} ${y0 - 30} ${50 + h.hw + 1} ${y0 - 30} ${50 + h.hw + 1} ${y0}Q${50 + h.hw - 3} ${y0 + 8} ${50 + h.hw - 7} ${y0 + 1}Q${50 + 12} ${y0 + 11} ${50 + 6} ${y0 + 2}Q50 ${y0 + 6} ${50 - 6} ${y0 + 2}Q${50 - 12} ${y0 + 9} ${50 - h.hw + 7} ${y0 + 1}Q${50 - h.hw - 1} ${y0 + 6} ${50 - h.hw - 1} ${y0}Z`,
          ),
        ],
        col,
      );
      const sp = ["#F8D35B", "#72B4F2", "#FFFFFF", "#6CC487", "#BCA4F2"];
      if (kind === "frosting") {
        [
          [36, y0 - 12, 30],
          [46, y0 - 18, -40],
          [60, y0 - 15, 60],
          [66, y0 - 6, -20],
          [53, y0 - 6, 10],
          [30, y0 - 3, 70],
        ].forEach(([x, y, a], i) => {
          o.front += G(
            `rotate(${a} ${x} ${y})`,
            F(
              `<rect x="${x - 2.4}" y="${y - 0.9}" width="4.8" height="1.8" rx=".9"`,
              sp[i % 5],
            ),
          );
        });
        o.top = y0 - 23;
      } else {
        o.front += OL(
          [
            P(`M38 ${y0 - 12}C38 ${y0 - 24} 62 ${y0 - 24} 62 ${y0 - 12}Z`),
            P(`M43 ${y0 - 20}C43 ${y0 - 30} 57 ${y0 - 30} 57 ${y0 - 20}Z`),
            P(
              `M50 ${y0 - 26}Q50 ${y0 - 34} 54 ${y0 - 34}Q52 ${y0 - 30} 53 ${y0 - 26}Z`,
            ),
          ],
          col,
        );
        o.front += OL([Ci(50, y0 - 33, 3.2)], "#E8574D");
        o.top = y0 - 37;
      }
      break;
    }
    case "shell": {
      const y0 = Tp + 13;
      const col = r.p.shellCol || "#3D8F62";
      o.front =
        OL(
          [
            P(
              `M16 ${y0}C16 ${y0 - 32} 84 ${y0 - 32} 84 ${y0}C66 ${y0 + 5} 34 ${y0 + 5} 16 ${y0}Z`,
            ),
          ],
          col,
        ) +
        L(
          `M38 ${y0 + 1}L42 ${y0 - 10}L58 ${y0 - 10}L62 ${y0 + 1}M42 ${y0 - 10}L46 ${y0 - 21}M58 ${y0 - 10}L54 ${y0 - 21}M42 ${y0 - 10}L26 ${y0 - 7}M58 ${y0 - 10}L74 ${y0 - 7}`,
          1.8,
          E.tone(col, -0.15),
        );
      o.top = y0 - 25;
      break;
    }
    case "lid":
      o.back =
        OL(
          [P(`M34 ${Tp + 8}C34 ${Tp - 4} 66 ${Tp - 4} 66 ${Tp + 8}Z`)],
          pal.s,
        ) + OL([Ci(50, Tp - 3, 4)], pal.d);
      o.top = Tp - 7;
      break;
    case "nosecone":
      o.back = OL(
        [
          P(
            `M${50 - h.hw} ${Tp + 14}C${50 - h.hw + 2} ${Tp - 4} 50 ${Tp - 16} 50 ${Tp - 16}C50 ${Tp - 16} ${50 + h.hw - 2} ${Tp - 4} ${50 + h.hw} ${Tp + 14}Z`,
          ),
        ],
        "#E8574D",
      );
      o.top = Tp - 16;
      break;
    case "lava":
      o.front =
        OL(
          [
            P(
              `M41 ${Tp + 2}Q50 ${Tp - 4} 59 ${Tp + 2}L62 ${Tp + 8}Q60 ${Tp + 16} 57 ${Tp + 9}Q54 ${Tp + 20} 50 ${Tp + 10}Q46 ${Tp + 16} 43 ${Tp + 9}Q40 ${Tp + 14} 38 ${Tp + 8}Z`,
            ),
          ],
          "#F2683C",
        ) + OL([Ci(46, Tp - 6, 3), Ci(55, Tp - 10, 2.4)], "#F59A3C");
      o.top = Tp - 13;
      break;
    case "butter":
      o.front =
        OL(
          [
            P(
              `M28 ${Tp + 14}C28 ${Tp + 2} 72 ${Tp + 2} 72 ${Tp + 14}Q70 ${Tp + 22} 66 ${Tp + 15}Q62 ${Tp + 26} 58 ${Tp + 16}Q50 ${Tp + 20} 44 ${Tp + 16}Q38 ${Tp + 24} 34 ${Tp + 15}Q30 ${Tp + 20} 28 ${Tp + 14}Z`,
            ),
          ],
          "#B5652E",
        ) +
        OL(
          [`<rect x="43" y="${Tp - 2}" width="14" height="9" rx="2.4"`],
          "#F8E08A",
        );
      o.top = Tp - 4;
      break;
    case "salmon":
      o.front =
        OL(
          [
            P(
              `M${50 - h.hw - 2} ${Tp + 16}C${50 - h.hw} ${Tp - 2} ${50 + h.hw} ${Tp - 2} ${50 + h.hw + 2} ${Tp + 16}C70 ${Tp + 10} 30 ${Tp + 10} ${50 - h.hw - 2} ${Tp + 16}Z`,
            ),
          ],
          "#F48469",
        ) +
        L(
          `M34 ${Tp + 6}L40 ${Tp + 12}M46 ${Tp + 3}L52 ${Tp + 10}M58 ${Tp + 3}L63 ${Tp + 10}`,
          2.2,
          "#FBD3C4",
        );
      o.top = Tp - 2;
      break;
    case "sesame":
      o.front = [
        [38, Tp + 9, -20],
        [48, Tp + 5, 10],
        [58, Tp + 8, 30],
        [64, Tp + 14, -10],
        [43, Tp + 14, 40],
        [54, Tp + 13, -30],
      ]
        .map(([x, y, a]) => F(El(x, y, 1.6, 0.9, a), "#FFF6DC"))
        .join("");
      break;
    case "pleats":
      o.front = L(
        `M44 ${Tp + 4}Q46 ${Tp + 9} 44 ${Tp + 13}M50 ${Tp + 2}Q52 ${Tp + 8} 50 ${Tp + 12}M56 ${Tp + 4}Q58 ${Tp + 9} 56 ${Tp + 13}`,
        1.8,
        pal.s,
      );
      o.back = OL([P(`M44 ${Tp + 4}Q50 ${Tp - 10} 56 ${Tp + 4}Z`)], pal.b);
      o.top = Tp - 4;
      break;
    case "bonito":
      o.front = OL(
        [
          P(`M44 ${Tp + 4}L48 ${Tp - 3}L53 ${Tp}L50 ${Tp + 6}Z`),
          P(`M53 ${Tp + 5}L58 ${Tp - 1}L61 ${Tp + 4}L57 ${Tp + 8}Z`),
        ],
        "#F2B58A",
      );
      o.top = Tp - 4;
      break;
    case "ring": {
      const ring = (d: string, w: number, c: string) =>
        `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
      const full = `M4 ${h.cy - 4}A46 9 0 1 1 96 ${h.cy - 4}A46 9 0 1 1 4 ${h.cy - 4}`;
      const low = `M4 ${h.cy - 4}A46 9 0 0 0 96 ${h.cy - 4}`;
      o.back = G(
        `rotate(-14 50 ${h.cy - 4})`,
        ring(full, SW * 2 + 5, INK) + ring(full, 5, "#F6DD8A"),
      );
      o.front = G(
        `rotate(-14 50 ${h.cy - 4})`,
        ring(low, SW * 2 + 5, INK) + ring(low, 5, "#F6DD8A"),
      );
      o.top = h.cy - 15;
      break;
    }
    case "ufodome":
      o.back =
        OL(
          [P(`M34 ${Tp + 8}C34 ${Tp - 12} 66 ${Tp - 12} 66 ${Tp + 8}Z`)],
          "#BFE3EA",
          ' fill-opacity=".9"',
        ) + F(El(42, Tp - 2, 3, 5, 30), WH, ' opacity=".7"');
      o.top = Tp - 8;
      break;
    case "periscope":
      o.back = OLL(`M58 ${Tp + 6}L58 ${Tp - 12}L66 ${Tp - 12}`, 3.6, "#C98B4E");
      o.top = Tp - 15;
      break;
    case "toast":
      o.back =
        OL(
          [
            P(
              `M36 ${Tp + 8}L36 ${Tp - 6}Q36 ${Tp - 12} 43 ${Tp - 12}Q46 ${Tp - 16} 50 ${Tp - 12}L50 ${Tp + 8}Z`,
            ),
          ],
          "#E9B66C",
        ) +
        OL(
          [
            P(
              `M52 ${Tp + 8}L52 ${Tp - 3}Q52 ${Tp - 9} 58 ${Tp - 9}Q62 ${Tp - 13} 65 ${Tp - 8}L65 ${Tp + 8}Z`,
            ),
          ],
          "#E9B66C",
        );
      o.top = Tp - 16;
      break;
    case "umbrella": {
      const y0 = Tp + 4;
      o.front =
        OL(
          [
            P(
              `M12 ${y0}C14 ${y0 - 30} 86 ${y0 - 30} 88 ${y0}Q81 ${y0 - 6} 75 ${y0}Q69 ${y0 - 6} 62.5 ${y0}Q56 ${y0 - 6} 50 ${y0}Q44 ${y0 - 6} 37.5 ${y0}Q31 ${y0 - 6} 25 ${y0}Q19 ${y0 - 6} 12 ${y0}Z`,
            ),
          ],
          r.p.umb || "#E8574D",
        ) +
        L(
          `M37.5 ${y0}Q40 ${y0 - 14} 50 ${y0 - 22}M62.5 ${y0}Q60 ${y0 - 14} 50 ${y0 - 22}`,
          1.6,
        ) +
        OLL(`M50 ${y0 - 22}L50 ${y0 - 27}`, 2, INK);
      o.top = y0 - 28;
      break;
    }
    case "hairlong": {
      const col = r.p.hair || "#E8574D";
      o.back = OL(
        [
          P(
            `M${50 - h.hw - 6} ${h.cy + 34}C${50 - h.hw - 12} ${h.cy + 4} ${50 - h.hw - 8} ${Tp - 4} 50 ${Tp - 5}C${50 + h.hw + 8} ${Tp - 4} ${50 + h.hw + 12} ${h.cy + 4} ${50 + h.hw + 6} ${h.cy + 34}Z`,
          ),
        ],
        col,
      );
      o.front = OL(
        [
          P(
            `M${50 - h.hw + 2} ${h.cy - 6}C${50 - h.hw + 4} ${Tp + 2} 46 ${Tp - 2} 54 ${Tp}C${50 + h.hw - 6} ${Tp + 4} ${50 + h.hw - 2} ${h.cy - 14} ${50 + h.hw} ${h.cy - 4}C62 ${h.cy - 14} 50 ${h.cy - 16} 44 ${h.cy - 12}C40 ${h.cy - 10} 34 ${h.cy - 10} ${50 - h.hw + 2} ${h.cy - 6}Z`,
          ),
        ],
        col,
      );
      o.top = Tp - 7;
      break;
    }
    case "widow":
      o.front = OL(
        [
          P(
            `M${50 - h.hw} ${h.cy - 2}C${50 - h.hw} ${Tp - 6} ${50 + h.hw} ${Tp - 6} ${50 + h.hw} ${h.cy - 2}C${50 + h.hw - 6} ${h.cy - 12} 56 ${h.cy - 14} 50 ${h.cy - 8}C44 ${h.cy - 14} ${50 - h.hw + 6} ${h.cy - 12} ${50 - h.hw} ${h.cy - 2}Z`,
          ),
        ],
        "#2D3240",
      );
      o.top = Tp - 3;
      break;
    case "spout":
      o.back =
        G(
          T(50 - h.hw + 2, h.cy + 6),
          OL([P("M2-4C-8-6-12-14-14-20L-10-21C-8-14-4-10 4 4Z")], pal.s),
        ) +
        G(T(50 + h.hw - 2, h.cy + 2), OLL("M0-8C10-10 12 10 0 10", 4, pal.s));
      o.top = h.cy - 22;
      break;
    case "cactusarms":
      o.back =
        OLL(
          `M${50 - h.hw + 4} ${h.cy + 14}L${50 - h.hw - 6} ${h.cy + 14}L${50 - h.hw - 6} ${h.cy}`,
          8,
          pal.b,
        ) +
        OLL(
          `M${50 + h.hw - 4} ${h.cy + 22}L${50 + h.hw + 6} ${h.cy + 22}L${50 + h.hw + 6} ${h.cy + 4}`,
          8,
          pal.b,
        );
      o.top = h.cy - 4;
      break;
    case "cupfrost": {
      const col = r
        ? r.pick("frost", [
            "#F49AB4",
            "#BCA4F2",
            "#A6E3C8",
            "#F6EEDC",
            "#8C5E3C",
            "#8BD8E8",
          ])
        : "#F49AB4";
      o.front =
        OL([P("M45 30C44 23 50 17 57.4 15.6C54.6 20 56.4 25 55 30Z")], col) +
        OL(
          [
            P(
              "M33 40C31 32 38 26.4 45 28.2C48 22.4 58 22.4 61 28.2C67 28.4 70 34.4 67 40.6C58 45 42 45 33 40Z",
            ),
          ],
          col,
        ) +
        OL(
          [
            P(
              "M24 53C21 44.6 28 37 37 38.6C40.4 31.6 52 30.6 56 35.6C63 32.6 72 37.4 71 45C77 47 78.4 53 76 56.4C64 61 36 61 24 53Z",
            ),
          ],
          col,
        ) +
        OL(
          [
            P(
              "M16.6 64C12.6 57 18 50 26 51C29 45 38 44 43 48C47 42 55 42 59 47C63 43 72 44 75 50C83 50 88.4 57 83.4 64C79 70.4 21 70.4 16.6 64Z",
            ),
          ],
          col,
        ) +
        L(
          "M28 56Q40 60 52 56M56 46Q64 49 70 46M38 37Q46 40 54 37",
          1.4,
          E.tone(col, -0.12),
        );
      const sp = ["#F8D35B", "#72B4F2", "#FFFFFF", "#6CC487", "#E8574D"];
      [
        [30, 60, 30],
        [44, 63, -30],
        [62, 59, 50],
        [73, 62, -10],
        [40, 50, 70],
        [58, 52, -50],
        [48, 39, 20],
        [30, 47, -20],
      ].forEach(([x, y, a], i) => {
        o.front += G(
          `rotate(${a} ${x} ${y})`,
          F(
            `<rect x="${x - 2.2}" y="${y - 0.8}" width="4.4" height="1.6" rx=".8"`,
            sp[i % 5],
          ),
        );
      });
      o.front +=
        L("M56.4 11Q58 5 63 3.6", 1.8) +
        OL([Ci(55.6, 14.6, 5)], "#E8574D") +
        F(El(53.8, 12.8, 1.4, 1), WH, ' opacity=".8"');
      o.top = 3;
      break;
    }
    case "muffintop":
      o.front =
        OL(
          [
            P(
              "M14.4 66C9 50 24 31 50 31C76 31 91 50 85.6 66C76 72.4 24 72.4 14.4 66Z",
            ),
          ],
          "#C98B4E",
        ) +
        [
          [30, 46, 3.2],
          [52, 40, 3.6],
          [68, 50, 3],
          [40, 58, 2.8],
          [62, 61, 3],
          [24, 60, 2.4],
        ]
          .map(([x, y, rr]) => OL([Ci(x, y, rr)], "#5B4BA8"))
          .join("") +
        F(El(36, 40, 5, 2.4, -30), WH, ' opacity=".35"');
      o.top = 29;
      break;
    case "caramel":
      o.front =
        OL(
          [
            P(
              `M${50 - h.hw} ${Tp + 14}C${50 - h.hw} ${Tp - 2} ${50 + h.hw} ${Tp - 2} ${50 + h.hw} ${Tp + 14}Q${50 + h.hw - 3} ${Tp + 22} ${50 + h.hw - 7} ${Tp + 15}Q62 ${Tp + 26} 58 ${Tp + 16}Q50 ${Tp + 20} 44 ${Tp + 16}Q38 ${Tp + 24} 34 ${Tp + 15}Q${50 - h.hw + 2} ${Tp + 20} ${50 - h.hw} ${Tp + 14}Z`,
            ),
          ],
          "#B5652E",
        ) + F(El(42, Tp + 5, 5, 1.6, -12), "#FFFFFF", ' opacity=".35"');
      o.top = Tp - 1;
      break;
    case "lettuce": {
      let d = `M${50 - h.hw - 4} ${Tp + 12}`;
      for (let k = 0; k <= 8; k++) {
        const x = 50 - h.hw - 4 + ((h.hw * 2 + 8) * k) / 8;
        d += `Q${n(x - (h.hw + 4) / 8)} ${Tp - 2 - (k % 2) * 3} ${n(x)} ${Tp + 3}`;
      }
      d += `L${50 + h.hw + 4} ${Tp + 12}Z`;
      o.back = OL([P(d)], "#7CC46A");
      o.front =
        F(Ci(40, Tp + 4, 3), "#E8574D") + F(Ci(58, Tp + 2, 3.4), "#E8574D");
      o.top = Tp - 6;
      break;
    }
    case "snailshell": {
      const x = 50 + h.hw - 2;
      const y = h.cy - 6;
      o.back =
        OL([Ci(x, y, 18)], "#E9A96B") +
        L(
          `M${x} ${y}m-1 0a1.5 1.5 0 0 1 3 0a4 4 0 0 1-8 0a7 7 0 0 1 14 0a10.5 10.5 0 0 1-21 0`,
          2.2,
          "#A06F4C",
        );
      o.top = y - 19;
      break;
    }
    default:
      break;
  }
  return o;
}

// Wings and tails: behind everything, at the sides.
export function wings(kind: string, h: Head, pal: Pal): string {
  if (kind === "bushytail")
    return (
      OL(
        [
          P(
            "M64 100C94 96 100 58 84 40C74 30 60 38 64 50C67 58 78 56 76 68C74 78 62 80 58 92Z",
          ),
        ],
        pal.b,
      ) +
      F(
        P("M70 92C88 86 92 62 82 50C78 46 72 48 74 54C80 62 82 76 70 92Z"),
        pal.l,
      )
    );
  let s = "";
  const y = h.cy + 6;
  if (kind === "feather") {
    s = MIR(
      G(
        T(50 - h.hw + 4, y, -10),
        OL(
          [
            P(
              "M4-2C-6-16-22-18-28-10C-24-8-22-4-25 0C-20 1-18 4-20 7C-12 8-6 8 4 6Z",
            ),
          ],
          pal.s,
        ),
      ),
    );
  } else if (kind === "insect") {
    s = MIR(
      G(
        T(50 - h.hw + 6, y - 8, -30),
        OL([El(-12, -2, 13, 7)], "#EAF5FB", ' fill-opacity=".92"') +
          L("M-2-1L-20-3", 1.2, "#9FB3C8"),
      ),
    );
  } else if (kind === "butterfly") {
    s = MIR(
      G(
        T(50 - h.hw + 6, y - 2),
        OL(
          [
            P("M4-4C-6-26-30-26-30-8C-30 2-16 4 4 0Z"),
            P("M4 2C-10 2-24 8-20 20C-16 28-2 20 4 6Z"),
          ],
          pal.s,
        ) +
          F(Ci(-18, -10, 3.6), WH) +
          F(Ci(-12, 12, 2.6), WH),
      ),
    );
  } else if (kind === "bat") {
    s = MIR(
      G(
        T(50 - h.hw + 4, y - 4, -6),
        OL(
          [
            P(
              "M4-6C-8-18-22-20-32-12C-28-8-28-4-30 0C-24-2-22 2-22 6C-16 3-12 6-12 10C-6 6 0 6 4 6Z",
            ),
          ],
          E.tone(pal.b, -0.18),
        ),
      ),
    );
  } else if (kind === "fairy") {
    s = MIR(
      G(
        T(50 - h.hw + 6, y - 6, -24),
        OL([El(-12, -4, 12, 8)], "#F3E9FF", ' fill-opacity=".92"') +
          F(El(-12, -4, 6, 3.6), "#D9C7F4", ' opacity=".8"'),
      ),
    );
  } else if (kind === "fins") {
    s = MIR(
      G(
        T(50 - h.hw + 4, y, -10),
        OL([P("M4-2C-8-8-18-6-24 2C-16 6-8 8 4 6Z")], pal.s),
      ),
    );
  }
  return s;
}
