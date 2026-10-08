// Seed hashing, keyed draws and stable weighted picks, plus the colour helpers.

function fmix(h: number) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a over the string, finished with Murmur's mixer. */
function h32(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return fmix(h);
}

const keys = new Map<string, number>();
const key = (k: string) => {
  let v = keys.get(k);
  if (v === undefined) {
    v = h32(k);
    keys.set(k, v);
  }
  return v;
};
const mix = (a: number, b: number) =>
  fmix(Math.imul(a ^ b, 0x9e3779b1) ^ (a >>> 15));
const unit = (sh: number, t: string, o: string) =>
  (mix(mix(sh, key(t)), key(o)) + 0.5) / 4294967296;

/** An option, or an option and its weight. */
export type Option<T extends string = string> = T | readonly [T, number];

export interface Rng {
  /** The seed's hash. */
  sh: number;
  /** A number in (0, 1) for trait `t` (and option `o`). */
  u(t: string, o?: string): number;
  pick<T extends string>(t: string, opts: readonly Option<T>[]): T;
  chance(t: string, p: number): boolean;
}

/** Keyed draws: every trait has its own stream, so adding a trait never shifts the others. */
export function rng(seed: string): Rng {
  const sh = h32(seed);
  return {
    sh,
    u: (t, o = "") => unit(sh, t, o),
    // Weighted rendezvous: adding an option only moves the seeds it wins.
    pick<T extends string>(t: string, opts: readonly Option<T>[]): T {
      let best = (Array.isArray(opts[0]) ? opts[0][0] : opts[0]) as T;
      let bs = Number.NEGATIVE_INFINITY;
      for (const o of opts) {
        const [id, w] = typeof o === "string" ? [o, 1] : o;
        if (!(w > 0)) continue;
        const sc = Math.log(unit(sh, t, id)) / w;
        if (sc > bs) {
          bs = sc;
          best = id;
        }
      }
      return best;
    },
    chance: (t, p) => unit(sh, t, "?") < p,
  };
}

const h2r = (h: string) => {
  const v = Number.parseInt(h.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
const r2h = (r: number, g: number, b: number) =>
  `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1).toUpperCase()}`;

function hsl(hex: string): [number, number, number] {
  const [r, g, b] = h2r(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  let h = 0;
  let s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h =
      mx === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : mx === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hex(h: number, s: number, l: number) {
  const k = (v: number) => (v + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (v: number) =>
    l - a * Math.max(-1, Math.min(k(v) - 3, 9 - k(v), 1));
  return r2h(f(0) * 255, f(8) * 255, f(4) * 255);
}

const cl = (v: number) => Math.max(0, Math.min(1, v));

/** The colour, lighter or darker (and more or less saturated). */
export const tone = (c: string, dl: number, ds = 0) => {
  const [h, s, l] = hsl(c);
  return hex(h, cl(s + ds), cl(l + dl));
};

/** From colour a towards colour b. */
export const mixc = (a: string, b: string, t: number) => {
  const A = h2r(a);
  const B = h2r(b);
  return r2h(
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  );
};

/** Relative luminance. */
export const lum = (c: string) => {
  const v = h2r(c).map((x) => {
    const y = x / 255;
    return y <= 0.03928 ? y / 12.92 : ((y + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
};

const hueDist = (a: string, b: string) => {
  const [ha, sa] = hsl(a);
  const [hb, sb] = hsl(b);
  if (sa < 0.12 || sb < 0.12) return 180;
  const d = Math.abs(ha - hb) % 360;
  return Math.min(d, 360 - d);
};

/** The eight avatar colours of the design system (`AVATAR_COLORS`). */
export const BG = [
  "#DCE8FA",
  "#F4C7D9",
  "#BFE6C8",
  "#D9C7F4",
  "#BFE3EA",
  "#F3D3B8",
  "#F2E3A8",
  "#D7DDE8",
] as const;

/** A pastel that keeps its distance from the character's main colour. */
export function background(r: Rng, main: string): string {
  const ok = BG.filter((c) => hueDist(c, main) > 40);
  return r.pick("bg", ok.length ? ok : BG);
}

/** One decimal, for short paths. */
export const n1 = (v: number) => Math.round(v * 10) / 10;
