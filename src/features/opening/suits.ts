// The Impostor's suspects: monster costumes cut from the avatar generator's
// silhouettes (gum, bean, ghost, pear, fluffy, drip), with a head detail (ears,
// horns, antenna, a tuft) and joke legs (stubs, chicken legs, tentacles). The
// player's face shows through a round hole. Each costume walks in four drawn
// frames, like a sprite. The prototype's geometry, as it was tuned.
import { mix } from "./title-kit";

/** [silhouette, head, legs, scale, height] per seat. */
type Cast = readonly [string, string, string, number, number];
export const CASTS: readonly Cast[] = [
  ["gum", "ears", "stubs", 1.0, 1.0],
  ["ghost", "hair", "none", 0.9, 0.84],
  ["pear", "none", "chicken", 1.08, 1.12],
  ["fluffy", "horns", "stubs", 0.94, 0.9],
  ["drip", "antenna", "none", 1.04, 1.24],
  ["gum", "horns", "tentacles", 0.88, 0.8],
  ["bean", "hair", "chicken", 1.0, 1.1],
  ["ghost", "ears", "none", 1.1, 0.96],
  ["pear", "antenna", "tentacles", 0.92, 1.08],
  ["fluffy", "none", "stubs", 1.06, 0.88],
];

/** A row's sizes: slot width and gap, the face, the card held up (its width and the room it takes). */
export interface SuitSize {
  w: number;
  gap: number;
  av: number;
  pw: number;
  ph: number;
}

/** One walking frame of a costume. */
export interface SuitFrame {
  body: string;
  legS: string;
  legF: string;
  legSW: number;
  /** The body's pose, for the svg. */
  tr: string;
  /** The same pose for the face and the card (CSS). */
  css: string;
}

export interface Suit {
  fw: number;
  fh: number;
  vb: string;
  /** The face's size and place in the hole. */
  avs: number;
  ax: number;
  ay: number;
  tuft: string;
  back: string;
  inner: string;
  stalk: string;
  backC: string;
  innerC: string;
  legC: string;
  legFC: string;
  frames: SuitFrame[];
  /** The poses' origin (CSS px). */
  org: string;
  hl: string;
  hlW: number;
  stW: number;
  /** Where the card is held (its widest, left, top) and the paws' size. */
  pw: number;
  bl: number;
  bt: number;
  pd: number;
  /** The shadow on the floor. */
  footW: number;
  footML: number;
}

const INK = "#1E2433";
const r1 = (x: number) => Math.round(x * 10) / 10;
function pt(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))];
}
const circ = (x: number, y: number, r: number) =>
  `M${r1(x - r)} ${r1(y)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0Z`;
function gumD(cx: number, cy: number, hw: number, f: number, H: number) {
  const l = cx - hw;
  const R = cx + hw;
  const k = H - cy;
  return `M${r1(l - f)} ${H - 7}Q${r1(l - f)} ${H} ${r1(l - f + 7)} ${H}L${r1(R + f - 7)} ${H}Q${r1(R + f)} ${H} ${r1(R + f)} ${H - 7}C${r1(R + f)} ${r1(cy + k * 0.45)} ${r1(R)} ${r1(cy + k * 0.18)} ${r1(R)} ${r1(cy)}A${r1(hw)} ${r1(hw)} 0 0 0 ${r1(l)} ${r1(cy)}C${r1(l)} ${r1(cy + k * 0.18)} ${r1(l - f)} ${r1(cy + k * 0.45)} ${r1(l - f)} ${H - 7}Z`;
}

const HEM = [0, -5, 2, -3];
const DRIP = [1, 1.35, 0.8, 1.2];
const TC = [1, 0.35, -0.7, 0.35];

/** The body outline of walking frame `K`. */
function bodyOf(
  cast: Cast,
  sz: SuitSize,
  n: number,
  K: number,
): { body: string; f: number; geo: Geo } {
  const [shape, , legs] = cast;
  const sc = 1 + (cast[3] - 1) * (n > 8 ? 0.55 : 1);
  const hv = cast[4];
  const av = Math.round(sz.av * sc);
  const m = Math.round(av * 0.12);
  const hw = av / 2 + m;
  const LH =
    legs === "none"
      ? 0
      : Math.round(
          av * (legs === "stubs" ? 0.55 : legs === "chicken" ? 0.78 : 0.7),
        );
  let Hb = Math.round((m + av + av * (legs === "none" ? 1.72 : 1.16)) * hv);
  if (Hb < m + av + sz.ph + av * 0.32)
    Hb = Math.round(m + av + sz.ph + av * 0.32);
  const H = Hb + LH;
  const maxHalf = (sz.w + sz.gap) / 2 + 2;
  const W = Math.round(maxHalf * 2 + 40);
  const cx = W / 2;
  const cy = m + av / 2;
  const fmax = Math.max(0, maxHalf - hw);
  const geo = { av, m, hw, LH, Hb, H, W, cx, cy };
  let body = "";
  let f = 0;
  if (shape === "ghost" || shape === "drip") {
    const l = cx - hw;
    const R = cx + hw;
    body = `M${r1(l)} ${r1(cy)}A${r1(hw)} ${r1(hw)} 0 0 1 ${r1(R)} ${r1(cy)}`;
    if (shape === "ghost") {
      const nb = 4;
      const bw = (2 * hw) / nb;
      const yb = Hb - 10;
      body += `L${r1(R)} ${yb}`;
      for (let i = 0; i < nb; i++) {
        const x0 = R - i * bw;
        body += `Q${r1(x0 - bw / 2)} ${r1(Hb + 10 + HEM[(i + K) % 4])} ${r1(x0 - bw)} ${yb}`;
      }
      body += "Z";
    } else {
      let di = 0;
      const yh = Hb - 17;
      const dw = hw * 0.13;
      body += `L${r1(R)} ${yh}`;
      for (const d of [
        [0.84, 11],
        [0.6, 17],
        [0.36, 8],
        [0.15, 13],
      ]) {
        const x = l + 2 * hw * d[0];
        const L = d[1] * DRIP[(di++ + K) % 4];
        body += `L${r1(x + dw)} ${yh}C${r1(x + dw)} ${r1(yh + L)} ${r1(x - dw)} ${r1(yh + L)} ${r1(x - dw)} ${yh}`;
      }
      body += `L${r1(l)} ${yh}Z`;
    }
  } else {
    f =
      shape === "pear"
        ? Math.min(fmax + 6, av * 0.32)
        : Math.min(fmax, shape === "bean" ? av * 0.04 : av * 0.13);
    body = gumD(cx, cy, hw, f, Hb);
    if (shape === "fluffy") {
      const rb = m * 0.95 + 1.5;
      for (let k = 0; k <= 8; k++) {
        const q = pt(cx, cy, hw + 0.5, 180 + k * 22.5);
        body += circ(q[0], q[1], rb);
      }
      body +=
        circ(cx - hw - f * 0.4, cy + hw * 0.5, rb) +
        circ(cx + hw + f * 0.4, cy + hw * 0.5, rb);
    }
  }
  return { body, f, geo };
}

interface Geo {
  av: number;
  m: number;
  hw: number;
  LH: number;
  Hb: number;
  H: number;
  W: number;
  cx: number;
  cy: number;
}

/** A costume for seat `cast` in a row of `n`, in the player's colour `seat`. */
export function suitGeo(
  cast: Cast,
  sz: SuitSize,
  n: number,
  seat: string,
): Suit {
  const [shape, head, legs] = cast;
  const { f, geo } = bodyOf(cast, sz, n, 0);
  const { av, m, hw, LH, Hb, H, W, cx, cy } = geo;
  let back = "";
  let inner = "";
  let stalk = "";
  let tuft = "";
  let backC = seat;
  const innerC = mix(seat, "#FFFFFF", 0.42);
  let legC = seat;
  const legFC = mix(seat, INK, 0.24);
  // the head
  const top = cy - hw;
  if (head === "ears") {
    const re = m * 1.75;
    for (const deg of [228, 312]) {
      const c = pt(cx, cy, hw * 0.96, deg);
      back += circ(c[0], c[1], re);
      const c2 = pt(cx, cy, hw * 0.96 + re * 0.12, deg);
      inner += circ(c2[0], c2[1], re * 0.52);
    }
  } else if (head === "horns") {
    backC = "#F3E6C4";
    for (const deg of [238, 302]) {
      const a = (deg * Math.PI) / 180;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      const px = -dy;
      const py = dx;
      const bx = cx + hw * 0.93 * dx;
      const by = cy + hw * 0.93 * dy;
      const bh = m * 0.95;
      const hl = m * 2.3;
      const tx = bx + dx * hl - (deg < 270 ? -1 : 1) * m * 0.5;
      const ty = by + dy * hl;
      back += `M${r1(bx + px * bh)} ${r1(by + py * bh)}Q${r1(bx + px * bh * 0.4 + dx * hl * 0.6)} ${r1(by + py * bh * 0.4 + dy * hl * 0.6)} ${r1(tx)} ${r1(ty)}Q${r1(bx - px * bh * 0.2 + dx * hl * 0.5)} ${r1(by - py * bh * 0.2 + dy * hl * 0.5)} ${r1(bx - px * bh)} ${r1(by - py * bh)}Z`;
    }
  } else if (head === "antenna") {
    const ex = cx + m * 0.6;
    const ey = top - m * 2.3;
    // the antenna in the same colour, joined to the head with no outline between
    stalk = `M${r1(cx)} ${r1(top + m * 0.8)}Q${r1(cx - m * 0.2)} ${r1(top - m * 1.2)} ${r1(ex)} ${r1(ey)}`;
    tuft = circ(ex, ey, m * 0.85);
  } else if (head === "hair") {
    // a three-lock tuft in the same colour, no outline between it and the head
    const T = cx - m * 0.3;
    const u = m;
    tuft =
      `M${r1(T - u * 2.1)} ${r1(top + u * 1.1)}` +
      `Q${r1(T - u * 2.6)} ${r1(top - u * 0.9)} ${r1(T - u * 1.5)} ${r1(top - u * 1.9)}` +
      `Q${r1(T - u * 1.2)} ${r1(top - u * 0.7)} ${r1(T - u * 0.5)} ${r1(top - u * 0.4)}` +
      `Q${r1(T - u * 0.6)} ${r1(top - u * 2.4)} ${r1(T + u * 0.7)} ${r1(top - u * 3.0)}` +
      `Q${r1(T + u * 0.4)} ${r1(top - u * 1.4)} ${r1(T + u * 1.0)} ${r1(top - u * 0.5)}` +
      `Q${r1(T + u * 1.5)} ${r1(top - u * 1.8)} ${r1(T + u * 2.5)} ${r1(top - u * 1.6)}` +
      `Q${r1(T + u * 2.4)} ${r1(top - u * 0.2)} ${r1(T + u * 2.3)} ${r1(top + u * 1.1)}Z`;
  }
  // the 4 walking frames: [how far the body sinks, width, height, lean, lifted leg (-1 left, 1 right)]
  const dn = legs === "none" ? 2 : Math.max(3, LH * 0.1);
  const up = legs === "none" ? av * 0.07 : Math.max(2, LH * 0.05);
  const POSE = [
    [dn, 1.035, 0.965, -1.2, 0],
    [-up, 0.975, 1.03, 0.8, 1],
    [dn, 1.035, 0.965, 1.2, 0],
    [-up, 0.975, 1.03, -0.8, -1],
  ];
  const lw0 = r1(Math.max(3.2, av * 0.05));
  const frames: SuitFrame[] = [];
  for (let K = 0; K < 4; K++) {
    const body =
      K > 0 && (shape === "ghost" || shape === "drip")
        ? bodyOf(cast, sz, n, K).body
        : bodyOf(cast, sz, n, 0).body;
    const P = POSE[K];
    const hip = Hb - 8 + P[0];
    const lift = P[4];
    let lw = lw0;
    let legS = "";
    let legF = "";
    if (legs === "stubs") {
      const sw = hw * 0.46;
      for (const sd of [-1, 1]) {
        const x = cx + sd * hw * 0.42;
        const a0 = x - sw / 2;
        const a1 = x + sw / 2;
        const rr = sw * 0.42;
        const G = lift === sd ? H - LH * 0.24 : H;
        legF += `M${r1(a0)} ${r1(hip)}L${r1(a0)} ${r1(G - rr)}Q${r1(a0)} ${r1(G)} ${r1(a0 + rr)} ${r1(G)}L${r1(a1 - rr)} ${r1(G)}Q${r1(a1)} ${r1(G)} ${r1(a1)} ${r1(G - rr)}L${r1(a1)} ${r1(hip)}Z`;
      }
    } else if (legs === "chicken") {
      legC = "#E9A23B";
      for (const sd of [-1, 1]) {
        const up2 = lift === sd ? LH * 0.26 : 0;
        const x = cx + sd * hw * 0.34;
        const ax = x + sd * 3;
        const ay = H - 7 - up2;
        const t = av * 0.11;
        const kx = x + (lift === sd ? sd * LH * 0.16 : -sd * 2);
        legS +=
          `M${r1(x)} ${r1(hip + 2)}L${r1(kx)} ${r1((hip + ay) / 2)}L${r1(ax)} ${r1(ay)}` +
          `M${r1(ax)} ${r1(ay)}L${r1(ax - t)} ${r1(H - 1 - up2)}M${r1(ax)} ${r1(ay)}L${r1(ax + sd * 1.5)} ${r1(H - up2)}M${r1(ax)} ${r1(ay)}L${r1(ax + t)} ${r1(H - 1 - up2)}`;
      }
    } else if (legs === "tentacles") {
      lw = r1(hw * 0.2);
      for (const [tx, ts] of [
        [-0.56, -1],
        [0, 1],
        [0.56, 1],
      ]) {
        const x = cx + tx * hw;
        const c = ts * hw * 0.16 * TC[(K + (tx > 0 ? 2 : 0)) % 4];
        const G = lift !== 0 && tx * lift > 0 ? H - LH * 0.22 : H;
        legS +=
          `M${r1(x)} ${r1(hip)}C${r1(x)} ${r1(hip + 8 + LH * 0.35)} ${r1(x + c)} ${r1(G - LH * 0.25)} ${r1(x + c * 1.7)} ${r1(G - lw / 2)}` +
          `Q${r1(x + c * 2.5)} ${r1(G - lw / 2 - 2)} ${r1(x + c * 2.1)} ${r1(G - LH * 0.45)}`;
      }
    }
    const tr = `translate(0 ${r1(P[0])}) translate(${r1(cx)} ${Hb}) rotate(${P[3]}) scale(${P[1]} ${P[2]}) translate(${r1(-cx)} ${-Hb})`;
    const css = `translate(0px, ${r1(P[0])}px) rotate(${P[3]}deg) scale(${P[1]}, ${P[2]})`;
    frames.push({
      body,
      legS,
      legF,
      legSW: lw,
      tr,
      css,
    });
  }
  const hr = hw - m * 0.5;
  const h1 = pt(cx, cy, hr, 206);
  const h2 = pt(cx, cy, hr, 244);
  const pw = Math.round(Math.min(sz.pw, hw * 2 * 0.8));
  const bt = Math.round(m + av + av * 0.1);
  const pd = Math.round(av * 0.27);
  const baseHalf = legs === "none" ? hw + f : hw * 0.75;
  return {
    fw: W,
    fh: H,
    vb: `0 0 ${W} ${H}`,
    avs: av,
    tuft,
    back,
    inner,
    stalk,
    backC,
    innerC,
    frames,
    legC,
    legFC,
    org: `${r1(cx)}px ${Hb}px`,
    hl: `M${h1[0]} ${h1[1]}A${r1(hr)} ${r1(hr)} 0 0 1 ${h2[0]} ${h2[1]}`,
    hlW: r1(Math.max(2.4, m * 0.36)),
    stW: r1(Math.max(3.6, m * 0.42)),
    ax: r1(cx - av / 2),
    ay: m,
    pw,
    bl: r1(cx - pw / 2),
    bt,
    pd,
    footW: Math.round(baseHalf * 2.25),
    footML: -Math.round(baseHalf * 1.125),
  };
}
