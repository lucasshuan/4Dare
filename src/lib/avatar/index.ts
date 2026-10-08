// Avatars drawn from words: a guest's name becomes their face. Each word of a
// name maps to a piece of the drawing (kits.ts): the noun is the body, an
// adjective the expression, colour, pattern or something worn, a title a hat
// (and clothes on the neutral Dare), a second noun lends its hat, ears or skin.
// An avatar is stored as its DNA, the words and a variant:
// "Cat..Happy..0", "Potato.Ninja...0", "..Brave.Captain-f.k3", "!Doge.0". Every
// other choice (colour, eyes, pattern...) is a keyed draw from the DNA itself,
// so the same DNA always gives the same drawing, on the server and in the
// browser alike, and new options never reshuffle old avatars.

import { svgUri } from "../svg-uri";
import {
  antennae,
  at,
  BLOB,
  C,
  Ci,
  type Draws,
  ears,
  F,
  G,
  horns,
  INK,
  L,
  MIR,
  n,
  OL,
  P,
  type Pt,
  pal as palOf,
  SHAPES,
  spark,
  T,
  top,
  wings,
} from "./art";
import * as Dare from "./dare";
import { background, mixc, rng } from "./engine";
import { ADJ, LEGEND, NOUN, TITLE, TITLE_F } from "./kits";
import {
  brows,
  DEFAULT_EX,
  EX,
  type FaceKit,
  face,
  fx as fxOf,
  marks,
  stalkEyes,
  WEAR,
  type Wear,
} from "./parts";

/** The words of an avatar; a legend stands alone. */
export interface Words {
  noun?: string;
  noun2?: string;
  adj?: string;
  title?: string;
  /** The title's feminine form. */
  f?: boolean;
  legend?: string;
}

/** A word's pieces, parsed from its spec. */
interface Kit {
  shape?: string;
  e?: string;
  ec?: string;
  h?: string;
  a?: string;
  w?: string;
  f?: string;
  x?: string;
  o?: string;
  ex?: string;
  out?: string;
  tout?: string;
  style?: string;
  size?: number;
  tops: string[];
  marks: string[];
  wear: string[];
  fx: string[];
  colors: string[];
  p: Record<string, string>;
  flags: Record<string, boolean>;
  legend?: boolean;
}

type Field = Exclude<
  keyof Kit,
  | "size"
  | "tops"
  | "marks"
  | "wear"
  | "fx"
  | "colors"
  | "p"
  | "flags"
  | "legend"
>;
const FIELDS = new Set<string>([
  "shape",
  "e",
  "ec",
  "h",
  "a",
  "w",
  "f",
  "x",
  "o",
  "ex",
  "out",
  "tout",
  "style",
]);

/**
 * A spec: space-separated tokens. A bare shape name is the body ("blob": the
 * neutral Dare); `key:value` sets a piece (t: top, m: mark, wear:, fx:, c:
 * colours a/b/c, e: ears, ec: ear colour, h: horns, a: antennae, w: wings, f:
 * face carrier, x: eyes, o: mouth, ex: expression, out:/tout: clothes (tout
 * only from a title), size:, shape:, style:, p:key=value); `wear+key` and
 * other bare words are flags.
 */
function parse(spec: string): Kit {
  const k: Kit = {
    tops: [],
    marks: [],
    wear: [],
    fx: [],
    colors: [],
    p: {},
    flags: {},
  };
  for (const tok of spec.split(/\s+/)) {
    if (!tok) continue;
    if (tok === "blob" || Object.hasOwn(SHAPES, tok)) {
      k.shape = tok;
      continue;
    }
    const i = tok.indexOf(":");
    if (i < 0) {
      if (tok.startsWith("wear+")) k.p[tok.slice(5)] = "1";
      else k.flags[tok] = true;
      continue;
    }
    const key = tok.slice(0, i);
    const v = tok.slice(i + 1);
    if (key === "t") k.tops.push(v);
    else if (key === "m") k.marks.push(v);
    else if (key === "wear") k.wear.push(v);
    else if (key === "fx") k.fx.push(v);
    else if (key === "c") k.colors = v.split("/");
    else if (key === "p") {
      const j = v.indexOf("=");
      k.p[v.slice(0, j)] = v.slice(j + 1);
    } else if (key === "size") k.size = Number(v);
    else if (FIELDS.has(key)) k[key as Field] = v;
  }
  return k;
}

const copy = (k: Kit): Kit => ({
  ...k,
  tops: [...k.tops],
  marks: [...k.marks],
  wear: [...k.wear],
  fx: [...k.fx],
  p: { ...k.p },
  flags: { ...k.flags },
});

const nounKit = (word: string) => parse(NOUN[word] ?? "blob");

/** Tops that only make sense on their own body: a second noun lends them only to a bare head. */
const OWN_TOPS = new Set([
  "mushcap",
  "acorncap",
  "shell",
  "frosting",
  "frostswirl",
  "butter",
  "salmon",
  "sesame",
  "pleats",
  "lava",
  "umbrella",
  "cactusarms",
  "spout",
  "lid",
  "ring",
  "ufodome",
]);
/** Small tops a lent one replaces. */
const SMALL_TOPS = new Set([
  "crest",
  "comb",
  "tuft",
  "plume",
  "fin",
  "sprout",
  "leaf",
  "flower",
  "stem",
]);

/** What a second noun lends to the first: its hat, else its ears, horns and tops, else its skin. */
function lend(base: Kit, k2: Kit): Kit {
  const out = copy(base);
  out.p = { ...base.p, ...k2.p };
  if (k2.p.lend) {
    out.wear.push(...k2.p.lend.split(","));
    return out;
  }
  if (k2.wear.length) {
    out.wear.push(...k2.wear);
    return out;
  }
  let lent = false;
  for (const key of ["e", "h", "a", "w"] as const) {
    const v = k2[key];
    if (v && v !== "fishfins" && v !== "stalks") {
      out[key] = v;
      if (key === "e" && k2.ec) out.ec = k2.ec;
      lent = true;
    }
  }
  const tops = k2.tops.filter((t) => !OWN_TOPS.has(t) || !base.tops.length);
  if (tops.length) {
    out.tops = out.tops.filter((t) => !SMALL_TOPS.has(t)).concat(tops);
    lent = true;
  }
  if (k2.flags.bulge) {
    out.flags.bulge = true;
    lent = true;
  }
  if (lent) return out;
  if (k2.colors.length) out.colors = k2.colors;
  out.marks = out.marks.concat(
    k2.marks.filter((m) => !["belly", "bib", "cheeks"].includes(m)),
  );
  return out;
}

/** An adjective's or title's pieces over a kit; `lead` puts its wear first (a title's hat wins the head). */
function apply(k: Kit, spec: string, lead = false): Kit {
  const a = parse(spec);
  const out = copy(k);
  out.tops.push(...a.tops);
  out.marks.push(...a.marks);
  out.wear = lead ? [...a.wear, ...k.wear] : [...k.wear, ...a.wear];
  out.fx.push(...a.fx);
  out.p = { ...k.p, ...a.p };
  if (a.colors.length) out.colors = a.colors;
  if (a.ex) out.ex = a.ex;
  if (a.size) out.size = a.size;
  if (a.shape && k.shape !== "square") out.shape = a.shape;
  if (a.style) out.style = a.style;
  if (a.x) out.x = a.x;
  if (a.a) out.a = a.a;
  if (a.out) out.out = a.out;
  if (a.tout && !out.out) {
    out.out = a.tout;
    if (a.p.tshirt && !k.p.shirt) out.p.shirt = a.p.tshirt;
  }
  return out;
}

function kitOf(w: Words): Kit {
  if (w.legend) {
    const [head, ...rest] = (LEGEND[w.legend] ?? "blob").split(" ");
    let k = NOUN[head] ? nounKit(head) : parse(head);
    if (rest.length) k = apply(k, rest.join(" "));
    k.legend = true;
    return k;
  }
  let k = w.noun ? nounKit(w.noun) : parse("blob");
  if (w.noun2) k = lend(k, nounKit(w.noun2));
  if (w.adj) k = apply(k, ADJ[w.adj] ?? "");
  if (w.title)
    k = apply(k, (w.f && TITLE_F[w.title]) || TITLE[w.title] || "", true);
  return k;
}

// ---------- DNA ----------

const WORD = "[A-Za-z0-9]*";
const DNA = new RegExp(
  `^(?:!([A-Za-z0-9]+)|(${WORD})\\.(${WORD})\\.(${WORD})\\.(${WORD}?)(-f)?)\\.([0-9a-z]{1,10})$`,
);

/** The DNA for some words and a variant (base 36). */
export function dnaOf(w: Words, variant = "0"): string {
  if (w.legend) return `!${w.legend}.${variant}`;
  const title = w.title ? `${w.title}${w.f ? "-f" : ""}` : "";
  return `${w.noun ?? ""}.${w.noun2 ?? ""}.${w.adj ?? ""}.${title}.${variant}`;
}

/** The words in a DNA, or null when it is not one (or names a word no kit knows). */
function wordsOf(dna: string): Words | null {
  const m = DNA.exec(dna);
  if (!m) return null;
  const known = (word: string, table: Record<string, string>) =>
    !word || Object.hasOwn(table, word);
  if (m[1] !== undefined)
    return Object.hasOwn(LEGEND, m[1]) ? { legend: m[1] } : null;
  const [noun, noun2, adj, title] = [m[2], m[3], m[4], m[5]];
  if (
    !known(noun, NOUN) ||
    !known(noun2, NOUN) ||
    !known(adj, ADJ) ||
    !known(title, TITLE)
  )
    return null;
  const w: Words = {};
  if (noun) w.noun = noun;
  if (noun2) w.noun2 = noun2;
  if (adj) w.adj = adj;
  if (title) {
    w.title = title;
    w.f = m[6] === "-f";
  }
  return w;
}

/** Whether a string is a DNA whose every word has a kit. */
export const isDna = (s: string) => wordsOf(s) !== null;

const variant = (random: () => number) =>
  Math.floor(random() * 36 ** 4).toString(36);

const pickKey = (table: Record<string, string>, random: () => number) => {
  const keys = Object.keys(table);
  return keys[Math.floor(random() * keys.length)];
};

/** A random avatar: mostly an adjective and a noun, now and then a hybrid or a titled one. */
export function randomDna(random: () => number = Math.random): string {
  const roll = random();
  const noun = pickKey(NOUN, random);
  if (roll < 0.15)
    return dnaOf({ noun, noun2: pickKey(NOUN, random) }, variant(random));
  if (roll < 0.25)
    return dnaOf(
      { noun, title: pickKey(TITLE, random), f: random() < 0.5 },
      variant(random),
    );
  return dnaOf({ noun, adj: pickKey(ADJ, random) }, variant(random));
}

// ---------- drawing ----------

/** Head pieces a hat hides. */
const HAT_HIDES = new Set([
  "crest",
  "comb",
  "tuft",
  "plume",
  "fluff",
  "sprout",
  "leaf",
  "flower",
  "unihorn",
  "tusk",
  "fin",
  "mohawk",
  "flame",
  "leafcrown",
  "fronds",
  "calyx",
  "stem",
  "forelock",
  "peacock",
  "widow",
]);
/** Headwear that leaves the head's own top in place. */
const SOFT_HATS = new Set([
  "headband",
  "goggles",
  "headphones",
  "headset",
  "curl",
]);
/** Things worn around the head keep their size; with eyes high on the head they go under them. */
const WRAP = new Set(["headband", "goggles", "headphones", "headset"]);
/** Width of each hat, for the small ones that sit between high eyes. */
const HAT_W: Record<string, number> = {
  crown: 36,
  tiara: 36,
  tophat: 44,
  judgewig: 66,
  nemes: 62,
  laurel: 52,
  knight: 46,
  kabuto: 56,
  viking: 62,
  halo: 34,
  captain: 38,
  military: 42,
  mortarboard: 50,
  cowboy: 62,
  deerstalker: 40,
  beret: 46,
  cap: 44,
  toque: 32,
  bakerhat: 26,
  wizard: 48,
  pirate: 50,
  hardhat: 50,
  safari: 54,
  sailorcap: 40,
  fedora: 52,
  party: 24,
  beanie: 46,
  sleepcap: 56,
  curl: 12,
  gnomehat: 48,
  pilotcap: 46,
};
/** Effects drawn behind the body. */
const FX_BACK = new Set([
  "glow",
  "rainbow",
  "rays",
  "tail",
  "flametail",
  "tadtail",
  "comettail",
  "meteortail",
]);

const sc3 = (v: number) => Math.round(v * 1000) / 1000;

/** The body colour's name and value, from the kit's colours (or the Dare's). */
function bodyColour(k: Kit, r: ReturnType<typeof rng>) {
  const cname = r.pick("color", k.colors.length ? k.colors : BLOB);
  const col = C[cname] ?? cname;
  return {
    cname,
    col: k.style === "pastel" ? mixc(col, "#FFFFFF", 0.45) : col,
  };
}

/** The drawing as svg on a 100-unit canvas, transparent; small sizes (≤ 26 px) drop details. */
function draw(k: Kit, seed: string, size: number): string {
  const r = rng(seed);
  const lod = size <= 26 ? 0 : 1;
  const neutral = !k.shape || k.shape === "blob";
  const { cname, col } = bodyColour(k, r);
  const pal = palOf(col);
  const dare = Dare.pick(r, k.p, cname);
  const S = SHAPES[neutral ? dare.body : (k.shape ?? "gum")](r);
  const { h } = S;
  const f = { ...S.face };
  const rp: Draws = { u: r.u, pick: r.pick, p: k.p };
  let back = "";
  let mid = "";
  let front = "";
  let topY = h.T;
  const wearNames = k.wear.map((w) => w.split("=")[0]);
  const hatOn = wearNames.some(
    (w) => WEAR[w]?.slot === "head" && !SOFT_HATS.has(w),
  );

  // effects behind
  const fxs = [...k.fx];
  if (k.legend) fxs.unshift("rays");
  for (const x of fxs) if (FX_BACK.has(x)) back += fxOf(x, h);
  if (k.w) back += wings(k.w, h, k.p.wing ? palOf(k.p.wing) : pal);
  if (S.back) back += S.back(pal);

  // ears, horns, antennae, tops; the Dare's own topper when nothing else sits there
  const parts = [...S.parts];
  if (k.flags.bulge) {
    const y = h.cy - h.r * 0.74;
    parts.push(Ci(50 - 12, y, 10.5), Ci(50 + 12, y, 10.5));
    f.ey = n(y + 0.5);
    f.ex = 12;
    topY = Math.min(topY, y - 11);
  }
  if (
    neutral &&
    !k.e &&
    !k.h &&
    !k.a &&
    !k.tops.length &&
    !(hatOn && dare.top !== "nubs")
  ) {
    const o = Dare.topper(dare.top, h, pal, rp);
    back += o.back;
    topY = Math.min(topY, o.top);
  }
  if (k.e && k.e !== "floppy") {
    const e = ears(k.e, h, pal, k.ec ? C[k.ec] : null);
    back += e.back;
    topY = Math.min(topY, e.top);
  }
  if (k.h) {
    const e = horns(k.h, h);
    back += e.back;
    topY = Math.min(topY, e.top);
  }
  let stalkPts: Pt[] | null = null;
  if (k.a) {
    const e = antennae(k.a, h, pal);
    back += e.back;
    topY = Math.min(topY, e.top);
    if (e.eyes) stalkPts = e.eyes;
  }
  let frontTop = "";
  for (const t of k.tops) {
    if (hatOn && HAT_HIDES.has(t)) continue;
    const o = top(t, h, pal, rp);
    back += o.back;
    frontTop += o.front;
    topY = Math.min(topY, o.top);
  }

  // body, marks and, for a Dare, its clothes, clipped to the body
  const uid = `b${r.sh.toString(36)}`;
  let body = OL(parts, pal.b);
  const list =
    neutral && dare.belly && !k.out ? [...k.marks, "belly"] : k.marks;
  let mk = marks(list, { ...S, face: f }, pal, rp, lod);
  if (neutral && k.out)
    mk += F(P(Dare.SHIRT), dare.shirt) + Dare.outfit(k.out, dare.shirt);
  if (mk)
    body += `<clipPath id="${uid}">${parts.map((g) => `${g}/>`).join("")}</clipPath><g clip-path="url(#${uid})">${mk}</g>`;
  mid += k.style === "invisible" ? `<g opacity=".38">${body}</g>` : body;
  mid += frontTop;

  // one thing per slot (pins on the side can pile up)
  const worn: [string, string | undefined, Wear][] = [];
  const slots = new Set<string>();
  for (const w of k.wear) {
    const [name, alt] = w.split("=");
    const W = WEAR[name];
    if (!W || (slots.has(W.slot) && W.slot !== "side")) continue;
    slots.add(W.slot);
    worn.push([name, alt, W]);
  }
  const highEyes = !!stalkPts || !!k.flags.bulge;
  const wf = { ...f };
  if (stalkPts) {
    wf.ex = n(50 - stalkPts[0][0]);
    wf.ey = stalkPts[0][1];
  }
  if (k.x === "mono") wf.ex = 0.01;
  const eyesHidden = worn.some(
    ([, , W]) => W.slot === "eyes" && !W.keepEyes && !W.hideRight,
  );
  const ex = EX[k.ex ?? r.pick("ex", DEFAULT_EX)] ?? EX.smile;
  if (k.e === "floppy") {
    const [x, y] = at(h, 52);
    mid += MIR(
      G(
        T(x + 3, y + 2, 12),
        OL([P("M2-2C-8-4-15 6-14 20C-13 30-4 31-1 22C1 15 4 8 2-2Z")], pal.s),
      ),
    );
  }
  // masks go under the eyes, wherever the eyes are
  for (const [, alt, W] of worn)
    if (W.under) mid += G(T(50, wf.ey), W.d({ alt }, wf));

  // hats, then the face over them
  let hatUp = 0;
  let hatTop = h.T;
  const full = h.hw / 28;
  for (const [w, alt, W] of worn) {
    if (W.special || (W.slot !== "head" && W.slot !== "side")) continue;
    const o = { alt, lamp: k.p.lamp, badge: k.p.badge };
    if (W.slot === "side") {
      // pinned to the head: a bow on the upper right, a flower on the upper left, a plaster on the cheek
      const [px, py] = at(h, 38);
      const [tx, ty] =
        W.pin === "cheek"
          ? [50 + f.ex + 6, f.ey + 7]
          : W.pin === "left"
            ? [px, py]
            : [100 - px, py];
      const [cx, cy] = W.c ?? [0, 0];
      mid += G(
        `translate(${n(tx - cx * full)} ${n(ty - cy * full)}) scale(${sc3(full)})`,
        W.d(o, wf),
      );
      continue;
    }
    let sc = full;
    let y = h.T;
    // bands and goggles go round the forehead, which on a frog is just under the eyes
    if (k.flags.bulge && (w === "headband" || w === "goggles"))
      y = f.ey + 9 - 10 * full;
    if (highEyes && !WRAP.has(w)) {
      // a really small hat, sitting on the head between the eyes
      const gap = stalkPts
        ? 2 * (50 - (stalkPts[0][0] + 3)) - 5
        : 2 * (f.ex - 5) - 1;
      sc = Math.min(full, (gap / (HAT_W[w] ?? 40)) * 1.15);
      y = h.T + (stalkPts ? -2.5 : 1);
    }
    mid += G(T(50, y, 0, sc), W.d(o, wf));
    hatUp = Math.max(hatUp, (W.up ?? 0) * sc);
    hatTop = Math.min(hatTop, y);
  }
  const kf: FaceKit = {
    f: k.f,
    beak: k.p.beak,
    x: k.x,
    o: k.o,
    blush: !!k.flags.blush || neutral,
    eyeBase: !!k.flags.eyeBase || k.marks.includes("patches"),
    cheekpuffs: !!k.flags.cheekpuffs,
    noEyes: !!k.flags.noEyes || eyesHidden,
    stalks: !!stalkPts,
    faceAt: f,
  };
  mid += face({ ...S, face: f }, pal, kf, ex, lod);
  if (stalkPts) {
    mid += stalkEyes(ex.e === "dot" && k.x ? k.x : ex.e, stalkPts, pal, lod);
    if (ex.br && lod > 0)
      mid += brows(ex.br, { ey: wf.ey - 3.2, ex: wf.ex, my: f.my }, pal.dark);
  }

  // glasses, beards, collars, the astronaut's bubble
  for (const [, alt, W] of worn) {
    if (W.under) continue;
    const o = { alt, lamp: k.p.lamp, badge: k.p.badge };
    if (W.special === "bubble") {
      const R = Math.max(h.hw, h.r) + 9;
      const stalkR = stalkPts ? h.cy + 3 - (stalkPts[0][1] - 9) : 0;
      const Rb = Math.max(R, stalkR);
      const cy = h.cy + 3;
      front +=
        `<circle cx="50" cy="${n(cy)}" r="${n(Rb)}" fill="#EAF5FB" fill-opacity=".28" stroke="${INK}" stroke-width="2.4"/>` +
        L(
          `M${n(50 - Rb * 0.62)} ${n(cy - Rb * 0.5)}Q${n(50 - Rb * 0.3)} ${n(cy - Rb * 0.86)} ${n(50 + Rb * 0.05)} ${n(cy - Rb * 0.9)}`,
          2.6,
          "#FFFFFF",
        ) +
        OL(
          [
            `<rect x="${n(50 - R * 0.8)}" y="${n(h.cy + R * 0.66)}" width="${n(R * 1.6)}" height="9" rx="4.5"`,
          ],
          "#CDD3DD",
        );
      topY = Math.min(topY, cy - Rb);
      continue;
    }
    if (W.slot === "eyes" || W.slot === "brows")
      front += G(T(50, wf.ey), W.d(o, wf));
    else if (W.slot === "face")
      front += G(T(50, f.my + (W.dy ?? -2.8)), W.d(o, wf));
    else if (W.slot === "neck")
      front += G(T(50, Math.min(f.my + 15, 94)), W.d(o, wf));
  }
  if (hatUp) topY = Math.min(topY, hatTop - hatUp);
  if (lod > 0) {
    for (const x of fxs)
      if (!FX_BACK.has(x))
        front += fxOf(x, { ...h, T: Math.min(h.T, topY + 6) });
    if (k.legend)
      front += OL([P(spark(18, 22, 5)), P(spark(84, 30, 3.6))], "#F6E27A");
  }

  // fit: shrink about the bottom centre when something reaches above the canvas
  let s = topY < 5 ? 95 / (100 - topY) : 1;
  s *= k.size ?? 1;
  const inner = back + mid + front;
  const g =
    s !== 1
      ? `<g transform="translate(50 100) scale(${sc3(s)}) translate(-50 -100)">${inner}</g>`
      : inner;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${g}</svg>`;
}

/** The kit for a DNA; a malformed one draws the plain Dare. */
const kitFor = (dna: string) => kitOf(wordsOf(dna) ?? {});

/** The avatar as svg; `size` (px) picks the level of detail. */
export const avatarSvg = (dna: string, size = 64) =>
  draw(kitFor(dna), dna, size);

/** A pastel from the design system that sets the avatar off. */
export function avatarColor(dna: string): string {
  const r = rng(dna);
  return background(r, bodyColour(kitFor(dna), r).col);
}

const cache = new Map<string, string>();

/** The avatar as a data URI for an <img>, cached. */
export function avatarUri(dna: string, size = 64): string {
  const key = `${size <= 26 ? 0 : 1}${dna}`;
  let uri = cache.get(key);
  if (uri === undefined) {
    uri = svgUri(avatarSvg(dna, size));
    if (cache.size > 600) cache.clear();
    cache.set(key, uri);
  }
  return uri;
}
