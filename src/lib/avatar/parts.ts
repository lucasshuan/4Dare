import {
  BEAK,
  BLUSH,
  BONE,
  Ci,
  type Draws,
  El,
  F,
  type FacePts,
  G,
  GOLD,
  type Head,
  heart,
  INK,
  L,
  n,
  OL,
  OLL,
  P,
  type Pal,
  type Pt,
  type Shape,
  SW,
  spark,
  star,
  TONGUE,
  WH,
} from "./art";
import * as E from "./engine";

// Marks on the body, faces, things to wear and little effects.

/** Eyes, mouth and brows of an expression; b: blush (2: deeper). */
export interface Expression {
  e: string;
  m: string;
  br?: string;
  b?: number;
}

/** What the face needs from the kit. */
export interface FaceKit {
  f?: string;
  beak?: string;
  x?: string;
  o?: string;
  forceMouth?: string;
  blush?: boolean;
  eyeBase?: boolean;
  cheekpuffs?: boolean;
  noEyes?: boolean;
  stalks?: boolean;
  faceAt?: FacePts;
}

export interface WearOpts {
  alt?: string;
  lamp?: string;
  badge?: string;
}

/**
 * Something to wear. Hats are drawn for a 28-unit head around (0, top) and
 * reach `up` above it; eyewear around the eyes' centre; side pieces are pinned
 * by their local centre `c`.
 */
export interface Wear {
  slot: "head" | "side" | "eyes" | "brows" | "face" | "neck";
  d: (o: WearOpts, f: FacePts) => string;
  up?: number;
  under?: 1;
  keepEyes?: 1;
  hideRight?: 1;
  front?: 1;
  special?: "bubble";
  dy?: number;
  pin?: "left" | "right" | "cheek";
  c?: Pt;
}

// ---------- marks: painted on the body, clipped to it ----------
/** Marks of the objects and foods, drawn after the others. */
const MARKS: Record<string, (S: Shape, pal: Pal) => string> = {
  gemfacets: (_S, pal) =>
    L(
      "M21 33L79 33M36 33L50 12L64 33M36 33L43 95M64 33L57 95M36 33L50 50L64 33",
      1.6,
      pal.l,
    ),
  croissegs: (_S, pal) =>
    L(
      "M27 33Q34 46 29 62M40 29Q45 42 42 56M60 29Q55 42 58 56M73 33Q66 46 71 62",
      2.2,
      pal.s,
    ),
  jellolines: (_S, pal) =>
    L("M38 36L36 86M50 36L50 86M62 36L64 86", 2, pal.l, ' opacity=".8"'),
  bowlband: (_S, pal) =>
    F('<rect x="0" y="84" width="100" height="4"', WH) +
    L("M16 62L84 62", 2, pal.l),
  cupband: () =>
    F('<rect x="0" y="82" width="100" height="12"', "#E8574D") +
    F('<rect x="0" y="85" width="100" height="2"', WH),
  strings: () => L("M48 0L48 100M50 0L50 100M52 0L52 100", 0.8, "#F6EEDC"),
  solein: (_S, pal) =>
    `<rect x="32" y="16" width="36" height="92" rx="18" fill="${pal.l}" opacity=".7"/>`,
};

/** Marks painted on the body (clipped to it by the caller). */
export const marks = (
  list: string[],
  S: Shape,
  pal: Pal,
  r: Draws,
  lod: number,
) =>
  paint(
    list.filter((m) => !MARKS[m]),
    S,
    pal,
    r,
    lod,
  ) + list.map((m) => MARKS[m]?.(S, pal) ?? "").join("");

function paint(
  list: string[],
  S: Shape,
  pal: Pal,
  r: Draws,
  lod: number,
): string {
  const { h, face: f } = S;
  const { cy, hw, r: hr, T: Tp } = h;
  let s = "";
  const spotsAt = (
    count: number,
    rad: number,
    col: string,
    key: string,
    ring?: boolean,
  ) => {
    const C = [
      [-0.62, -0.6],
      [0.5, -0.76],
      [-0.88, 0.14],
      [0.86, -0.08],
      [-0.52, 1.05],
      [0.58, 1.1],
      [0.06, -0.94],
      [0.2, 1.45],
      [-0.82, 0.72],
      [0.82, 0.64],
      [-0.22, 1.5],
      [-0.3, -0.88],
      [0.76, -0.52],
    ];
    const picked = C.map((c, i): [number[], number] => [c, r.u(key, String(i))])
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);
    for (const [[dx, dy], u] of picked) {
      const x = 50 + dx * hw;
      const y = cy + dy * hr;
      const rr = rad * (0.75 + u * 0.5);
      s += ring
        ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rr)}" fill="${E.tone(col, 0.25)}" stroke="${col}" stroke-width="2.2"/>`
        : F(Ci(x, y, rr), col);
    }
  };
  for (const m of list) {
    switch (m) {
      case "belly":
        s += F(El(50, cy + hr * 1.32, hw * 0.72, hr * 0.86), pal.l);
        break;
      case "cheeks":
        s +=
          F(El(50 - f.ex - 1, f.my + 1, hw * 0.48, hr * 0.38), pal.l) +
          F(El(50 + f.ex + 1, f.my + 1, hw * 0.48, hr * 0.38), pal.l) +
          F(El(50, f.my + 6, hw * 0.5, hr * 0.42), pal.l);
        break;
      case "bib": {
        const ey = f.ey;
        const my = f.my;
        s += F(
          P(
            `M50 ${ey - 7}C44 ${ey - 14} ${50 - hw * 0.66} ${ey - 10} ${50 - hw * 0.66} ${ey + 2}C${50 - hw * 0.66} ${ey + 13} 43 ${my + 9} 50 ${my + 12}C57 ${my + 9} ${50 + hw * 0.66} ${ey + 13} ${50 + hw * 0.66} ${ey + 2}C${50 + hw * 0.66} ${ey - 10} 56 ${ey - 14} 50 ${ey - 7}Z`,
          ),
          WH,
        );
        break;
      }
      case "discs":
        s +=
          F(Ci(50 - f.ex - 1, f.ey, 10), pal.l) +
          F(Ci(50 + f.ex + 1, f.ey, 10), pal.l);
        break;
      case "darkdiscs":
        s +=
          F(Ci(50 - f.ex - 0.5, f.ey, 7.6), INK) +
          F(Ci(50 + f.ex + 0.5, f.ey, 7.6), INK);
        break;
      case "patches":
        s +=
          F(El(50 - f.ex - 0.6, f.ey + 0.8, 5.8, 7.6, 28), "#2D3240") +
          F(El(50 + f.ex + 0.6, f.ey + 0.8, 5.8, 7.6, -28), "#2D3240");
        break;
      case "band":
        s += F(
          `<rect x="${n(50 - hw - 2)}" y="${n(f.ey - 5.6)}" width="${n(hw * 2 + 4)}" height="11.2" rx="5.6"`,
          pal.d,
        );
        break;
      case "ninjaband":
        s += F(
          `<rect x="${n(50 - hw - 2)}" y="${n(f.ey - 6)}" width="${n(hw * 2 + 4)}" height="12" rx="3"`,
          "#F5D5B8",
        );
        break;
      case "stripes":
        for (let k = 0; k < 3; k++) {
          const y = cy - hr * 0.25 + k * 9.5;
          const len = 9 - k * 1.5;
          s +=
            F(
              P(
                `M${n(50 - hw - 2)} ${n(y - 3)}L${n(50 - hw + len)} ${n(y)}L${n(50 - hw - 2)} ${n(y + 3)}Z`,
              ),
              pal.d,
            ) +
            F(
              P(
                `M${n(50 + hw + 2)} ${n(y - 3)}L${n(50 + hw - len)} ${n(y)}L${n(50 + hw + 2)} ${n(y + 3)}Z`,
              ),
              pal.d,
            );
        }
        s += F(
          P(
            `M45 ${Tp - 1}L47 ${Tp + 9}L49 ${Tp - 1}ZM51 ${Tp - 1}L53 ${Tp + 9}L55 ${Tp - 1}Z`,
          ),
          pal.d,
        );
        break;
      case "zstripes":
        for (let k = 0; k < 4; k++) {
          const y = cy - hr * 0.55 + k * 9;
          s += F(
            P(
              `M${n(50 - hw - 2)} ${n(y - 3)}Q${n(50 - hw + 10)} ${n(y + 1)} ${n(50 - hw + 13 - k)} ${n(y + 3)}Q${n(50 - hw + 6)} ${n(y + 4)} ${n(50 - hw - 2)} ${n(y + 4)}Z`,
            ),
            INK,
          );
          s += F(
            P(
              `M${n(50 + hw + 2)} ${n(y - 3)}Q${n(50 + hw - 10)} ${n(y + 1)} ${n(50 + hw - 13 + k)} ${n(y + 3)}Q${n(50 + hw - 6)} ${n(y + 4)} ${n(50 + hw + 2)} ${n(y + 4)}Z`,
            ),
            INK,
          );
        }
        break;
      case "bands":
        s +=
          F(
            `<rect x="0" y="${n(f.my + 9)}" width="100" height="7"`,
            "#2D3240",
          ) +
          F(
            `<rect x="0" y="${n(f.my + 22)}" width="100" height="7"`,
            "#2D3240",
          ) +
          F(`<rect x="0" y="${n(Tp - 2)}" width="100" height="8"`, "#2D3240");
        break;
      case "clownbands":
        for (const x of [50 - hw * 0.66, 50 + hw * 0.66])
          s += `<rect x="${n(x - 3.6)}" y="0" width="7.2" height="110" fill="${WH}" stroke="${INK}" stroke-width="1.8"/>`;
        break;
      case "spots":
        spotsAt(7, 3.4, pal.d, "spots");
        break;
      case "whitespots":
        spotsAt(6, 2.4, WH, "wspots");
        break;
      case "rosettes":
        spotsAt(7, 2.8, pal.d, "ros", true);
        break;
      case "ladyspots":
        spotsAt(6, 4, INK, "lady");
        s += L(`M50 ${Tp - 2}L50 ${f.ey - 9}`, 2);
        break;
      case "tearlines":
        s += L(
          `M${n(50 - f.ex - 1.6)} ${n(f.ey + 4)}Q${n(50 - f.ex - 3)} ${n(f.my)} ${n(50 - f.ex + 1)} ${n(f.my + 4)}M${n(50 + f.ex + 1.6)} ${n(f.ey + 4)}Q${n(50 + f.ex + 3)} ${n(f.my)} ${n(50 + f.ex - 1)} ${n(f.my + 4)}`,
          2.2,
          pal.d,
        );
        break;
      case "specks":
        spotsAt(9, 1.2, pal.s, "specks");
        break;
      case "chips":
        spotsAt(7, 2.6, "#5B3A28", "chips");
        break;
      case "seeds":
        spotsAt(10, 1.1, "#FBE7A1", "seeds");
        break;
      case "grid": {
        let d = "";
        for (let x = 22; x <= 78; x += 9.4) d += `M${n(x)} 0V110`;
        for (let y = 30; y <= 110; y += 9.4) d += `M0 ${n(y)}H100`;
        s += L(d, 2.4, pal.s);
        break;
      }
      case "crosshatch": {
        let d = "";
        for (let k = -6; k <= 8; k++)
          d += `M${k * 9} 110l80-80M${k * 9} 30l80 80`;
        s += L(d, 1.6, pal.s);
        break;
      }
      case "pancake":
        for (let k = 1; k <= 3; k++)
          s += L(
            `M10 ${n(f.my + k * 9 - 3)}Q50 ${n(f.my + k * 9 + 3)} 90 ${n(f.my + k * 9 - 3)}`,
            2.2,
            pal.s,
          );
        break;
      case "burger":
        s +=
          F(
            P(
              `M0 ${n(f.my + 9)}Q12 ${n(f.my + 5)} 25 ${n(f.my + 9)}Q37 ${n(f.my + 13)} 50 ${n(f.my + 9)}Q62 ${n(f.my + 5)} 75 ${n(f.my + 9)}Q87 ${n(f.my + 13)} 100 ${n(f.my + 9)}L100 ${n(f.my + 15)}L0 ${n(f.my + 15)}Z`,
            ),
            "#7CC46A",
          ) +
          F(
            P(
              `M0 ${n(f.my + 14)}L100 ${n(f.my + 14)}L100 ${n(f.my + 18)}L60 ${n(f.my + 18)}L56 ${n(f.my + 23)}L52 ${n(f.my + 18)}L0 ${n(f.my + 18)}Z`,
            ),
            "#F8D35B",
          ) +
          F(
            `<rect x="0" y="${n(f.my + 18)}" width="100" height="9"`,
            "#7A4B33",
          );
        break;
      case "holes":
        spotsAt(5, 3.2, pal.s, "holes");
        break;
      case "scales": {
        let d = "";
        for (let row = 0; row < 5; row++) {
          for (let k = -1; k < 8; k++) {
            const x = 18 + k * 10 + (row % 2) * 5;
            const y = cy + hr * 0.62 + row * 7;
            d += `M${n(x - 4.6)} ${n(y)}q4.6 5 9.2 0`;
          }
        }
        s += L(d, 1.6, pal.s);
        break;
      }
      case "bandages":
        for (let k = 0; k < 9; k++) {
          const y = Tp + 3 + k * 8.4;
          if (Math.abs(y - f.ey) < 5) continue;
          s += L(
            `M10 ${n(y + (k % 2 ? 2 : -2))}L90 ${n(y + (k % 2 ? -2 : 2))}`,
            1.6,
            pal.s,
          );
        }
        break;
      case "cracks":
        s += L(
          `M${n(50 - hw * 0.6)} ${Tp + 2}L${n(50 - hw * 0.5)} ${Tp + 9}L${n(50 - hw * 0.66)} ${Tp + 14}M${n(50 + hw * 0.7)} ${n(cy + 10)}L${n(50 + hw * 0.52)} ${n(cy + 16)}L${n(50 + hw * 0.62)} ${n(cy + 24)}`,
          1.8,
          pal.d,
        );
        break;
      case "stitches":
        s +=
          L(
            `M${n(50 - hw * 0.62)} ${Tp + 4}L${n(50 - hw * 0.3)} ${Tp + 13}`,
            1.8,
          ) +
          L(
            `M${n(50 - hw * 0.56)} ${Tp + 10}L${n(50 - hw * 0.44)} ${Tp + 6}M${n(50 - hw * 0.46)} ${Tp + 13}L${n(50 - hw * 0.34)} ${Tp + 9}`,
            1.6,
          );
        break;
      case "ribs":
        s += L(
          `M${n(50 - hw * 0.42)} ${Tp - 4}Q${n(50 - hw * 0.62)} ${n(cy + 4)} ${n(50 - hw * 0.44)} 110M${n(50 + hw * 0.42)} ${Tp - 4}Q${n(50 + hw * 0.62)} ${n(cy + 4)} ${n(50 + hw * 0.44)} 110`,
          2.2,
          pal.s,
        );
        break;
      case "craters":
        spotsAt(5, 3.4, E.tone(pal.b, -0.2), "craters");
        break;
      case "net": {
        let d = "";
        for (let k = -4; k <= 9; k++)
          d += `M${k * 11} 110l60-90M${k * 11} 20l60 90`;
        s += L(d, 1.4, pal.l);
        break;
      }
      case "melonstripes":
        for (const x of [-0.75, -0.3, 0.3, 0.75])
          s += L(
            `M${n(50 + x * hw)} ${Tp - 2}Q${n(50 + x * hw * 1.25)} ${n(cy)} ${n(50 + x * hw)} 100`,
            3.6,
            pal.d,
          );
        break;
      case "galaxy":
        for (const [x, y, rr] of [
          [-0.6, -0.5, 1.4],
          [0.55, -0.66, 1],
          [-0.84, 0.3, 1],
          [0.8, 0.2, 1.4],
          [0.15, 1.2, 1.1],
          [-0.4, 1.0, 0.9],
          [0.5, 1.0, 0.8],
        ])
          s += F(spark(50 + x * hw, cy + y * hr, rr * 2.2), "#F6E27A");
        break;
      case "plaid":
        for (const x of [-0.6, 0, 0.6])
          s += F(
            `<rect x="${n(50 + x * hw - 3)}" y="0" width="6" height="110"`,
            pal.s,
            ' opacity=".55"',
          );
        for (const y of [-0.6, 0.2, 1.0])
          s += F(
            `<rect x="0" y="${n(cy + y * hr - 3)}" width="100" height="6"`,
            pal.s,
            ' opacity=".55"',
          );
        break;
      case "stripe":
        s += F(
          P(
            `M45.5 ${Tp - 4}L54.5 ${Tp - 4}L52.6 ${n(f.ey - 6)}Q50 ${n(f.ey - 3)} 47.4 ${n(f.ey - 6)}Z`,
          ),
          WH,
        );
        break;
      case "rings":
        for (let k = 0; k < 4; k++)
          s += L(
            `M10 ${Tp + 3 + k * 6}Q50 ${Tp - 3 + k * 6} 90 ${Tp + 3 + k * 6}`,
            1.8,
            pal.s,
          );
        break;
      case "faceplate":
        s += F(
          El(50, f.ey + 4, hw * 0.66, hr * 0.62),
          r.p.plate || E.tone(pal.b, -0.1),
        );
        break;
      case "slothmask":
        s +=
          F(El(50, f.ey + 3, hw * 0.72, hr * 0.5), pal.l) +
          F(El(50 - f.ex, f.ey + 1, 6, 3.4, 18), pal.d) +
          F(El(50 + f.ex, f.ey + 1, 6, 3.4, -18), pal.d);
        break;
      case "koi":
        s +=
          F(El(50 - hw * 0.5, Tp + 6, 12, 8, -20), "#F39A4C") +
          F(El(50 + hw * 0.7, cy + hr * 0.9, 10, 8, 20), "#F39A4C") +
          F(El(50 + hw * 0.2, Tp + 2, 5, 4), "#E8574D");
        break;
      case "orca":
        s +=
          F(El(50 - f.ex - 3, f.ey - 4, 6, 3.4, -20), WH) +
          F(El(50 + f.ex + 3, f.ey - 4, 6, 3.4, 20), WH) +
          F(El(50, cy + hr * 1.25, hw * 0.66, hr * 0.7), WH);
        break;
      case "liner":
        s += F(
          `<rect x="0" y="${n(f.my + 10)}" width="100" height="40"`,
          r.p.liner || "#F49AB4",
        );
        for (let x = 12; x < 90; x += 7)
          s += L(
            `M${x} ${n(f.my + 10)}L${x + 2} 110`,
            1.6,
            E.tone(r.p.liner || "#F49AB4", -0.15),
          );
        break;
      case "nori":
        s += F(
          `<rect x="${n(50 - 14)}" y="${n(f.my + 7)}" width="28" height="40" rx="3"`,
          "#2D3E3A",
        );
        break;
      case "noriband":
        s += F(`<rect x="44" y="0" width="12" height="110"`, "#2D3E3A");
        break;
      case "pepperoni":
        spotsAt(4, 3.8, "#C93A45", "pep");
        s += F(
          `<rect x="0" y="${n(f.my + 14)}" width="100" height="20"`,
          "#D9944A",
        );
        break;
      case "croissant":
        for (const x of [-0.55, -0.18, 0.18, 0.55])
          s += L(
            `M${n(50 + x * hw)} ${Tp}Q${n(50 + x * hw * 1.4)} ${n(cy + 6)} ${n(50 + x * hw * 1.2)} 110`,
            2.2,
            pal.s,
          );
        break;
      case "boxstripes":
        s += F(`<rect x="0" y="${n(f.my + 10)}" width="100" height="40"`, WH);
        for (let x = 8; x < 100; x += 14)
          s += F(
            `<rect x="${x}" y="${n(f.my + 10)}" width="7" height="40"`,
            "#E8574D",
          );
        break;
      case "sockstripes":
        for (let k = 0; k < 4; k++)
          s += F(
            `<rect x="0" y="${n(Tp + 2 + k * 12)}" width="100" height="5"`,
            WH,
            ' opacity=".9"',
          );
        break;
      case "seams":
        s += `<rect x="27" y="32" width="46" height="80" rx="9" fill="none" stroke="${pal.s}" stroke-width="1.6" stroke-dasharray="3 3"/>`;
        break;
      case "slots":
        s +=
          F(
            `<rect x="31" y="${Tp + 2}" width="14" height="3.6" rx="1.8"`,
            pal.d,
          ) +
          F(
            `<rect x="55" y="${Tp + 2}" width="14" height="3.6" rx="1.8"`,
            pal.d,
          ) +
          F(
            `<rect x="66" y="${n(f.my + 4)}" width="5" height="10" rx="2"`,
            pal.d,
          );
        break;
      case "portholes":
        for (const x of [26, 74])
          s += `<circle cx="${x}" cy="${n(cy + 8)}" r="4.6" fill="#BFE3EA" stroke="${INK}" stroke-width="2"/>`;
        break;
      case "lights":
        for (const x of [24, 37, 50, 63, 76])
          s += F(Ci(x, f.my + 12, 2.6), "#F6E27A");
        break;
      case "window":
        s += `<circle cx="50" cy="${n(f.my + 16)}" r="5.6" fill="#BFE3EA" stroke="${INK}" stroke-width="2"/>`;
        break;
      case "swirl":
        s += L(
          `M20 ${Tp + 8}Q50 ${Tp + 2} 80 ${Tp + 8}M24 ${n(cy + 16)}Q50 ${n(cy + 10)} 76 ${n(cy + 16)}M30 ${n(cy + 28)}Q50 ${n(cy + 24)} 70 ${n(cy + 28)}`,
          2,
          pal.l,
        );
        break;
      case "soundhole":
        s += `<circle cx="50" cy="${n(f.my + 17)}" r="5" fill="${pal.d}" stroke="${pal.s}" stroke-width="2"/>`;
        break;
      case "pit":
        s += `<circle cx="50" cy="${n(f.my + 18)}" r="9.5" fill="#A06F4C" stroke="${INK}" stroke-width="2"/>`;
        break;
      case "crease":
        s += L(`M50 ${Tp}Q46 ${n(cy - 8)} 50 ${n(f.ey - 6)}`, 1.8, pal.s);
        break;
      case "blushside":
        s += F(
          El(50 + hw * 0.6, Tp + 8, 14, 10, 30),
          "#F48469",
          ' opacity=".7"',
        );
        break;
      case "noodles":
        for (let k = 0; k < 3; k++)
          s += L(
            `M14 ${n(f.my + 8 + k * 5)}Q22 ${n(f.my + 4 + k * 5)} 30 ${n(f.my + 8 + k * 5)}T46 ${n(f.my + 8 + k * 5)}T62 ${n(f.my + 8 + k * 5)}T78 ${n(f.my + 8 + k * 5)}T94 ${n(f.my + 8 + k * 5)}`,
            1.8,
            pal.s,
          );
        break;
      case "bowl":
        s +=
          F(
            `<rect x="0" y="${n(f.my + 9)}" width="100" height="40"`,
            "#E8574D",
          ) + F(`<rect x="0" y="${n(f.my + 14)}" width="100" height="3"`, WH);
        break;
      case "sauce":
        s +=
          F(
            P(
              `M14 ${Tp + 10}Q30 ${Tp + 2} 50 ${Tp + 6}Q70 ${Tp + 2} 86 ${Tp + 10}L86 ${Tp - 10}L14 ${Tp - 10}Z`,
            ),
            "#6E3B22",
          ) +
          L(
            `M32 ${Tp + 2}L40 ${Tp + 5}L48 ${Tp + 1}L56 ${Tp + 5}L64 ${Tp + 1}`,
            1.4,
            "#F8E08A",
          );
        break;
      case "ridges":
        for (const x of [-0.6, -0.2, 0.2, 0.6])
          s += L(
            `M${n(50 + x * hw)} ${Tp - 2}L${n(50 + x * hw)} 110`,
            2.4,
            pal.s,
          );
        break;
      case "sugar":
        spotsAt(10, 0.9, WH, "sugar");
        break;
      case "drum":
        s +=
          F(`<rect x="0" y="0" width="100" height="${Tp + 9}"`, "#F6EEDC") +
          L(
            `M22 ${Tp + 12}L36 110M50 ${Tp + 12}L50 110M78 ${Tp + 12}L64 110`,
            1.8,
            GOLD,
          );
        break;
      case "yoyo":
        s += `<circle cx="50" cy="${n(cy)}" r="${n(hw * 0.86)}" fill="none" stroke="${pal.s}" stroke-width="2"/>`;
        break;
      case "kitecross":
        s += L(`M50 0L50 110M10 ${n(cy)}L90 ${n(cy)}`, 1.8, pal.d);
        break;
      case "facets":
        s += F(
          P(
            `M50 ${Tp - 4}L${n(50 + hw * 0.5)} ${n(cy)}L50 110L${n(50 - hw * 0.5)} ${n(cy)}Z`,
          ),
          pal.l,
          ' opacity=".55"',
        );
        break;
      case "glowbelly":
        s += F(El(50, cy + hr * 1.3, hw * 0.7, hr * 0.8), "#F6E27A");
        break;
      case "suckers":
        for (const x of [33, 44, 56, 67]) s += F(Ci(x, 84, 1.7), pal.l);
        break;
      case "segments":
        for (let k = 0; k < 4; k++)
          s += L(
            `M10 ${n(f.my + 6 + k * 7)}Q50 ${n(f.my + 10 + k * 7)} 90 ${n(f.my + 6 + k * 7)}`,
            1.8,
            pal.s,
          );
        break;
      case "bumps":
        spotsAt(8, 1.6, pal.s, "bumps");
        break;
      case "lines":
        s += L(
          `M${n(50 - hw * 0.7)} ${n(f.my + 6)}L${n(50 - hw * 0.4)} ${n(f.my + 6)}M${n(50 + hw * 0.7)} ${n(f.my + 14)}L${n(50 + hw * 0.38)} ${n(f.my + 14)}M${n(50 - hw * 0.66)} ${n(f.my + 22)}L${n(50 - hw * 0.36)} ${n(f.my + 22)}`,
          1.8,
          pal.s,
        );
        break;
      case "paintspots":
        s +=
          F(Ci(50 + hw * 0.5, Tp + 8, 3), "#72B4F2") +
          F(Ci(50 - hw * 0.6, cy + 16, 2.6), "#F8D35B") +
          F(Ci(50 + hw * 0.7, cy + 24, 2.2), "#E8574D");
        break;
      case "mud":
        s +=
          F(
            P(`M${n(50 - hw * 0.6)} ${Tp + 6}q4-3 7 0q3 3 0 5q-4 3-7 0Z`),
            "#8C5E3C",
            ' opacity=".8"',
          ) +
          F(Ci(50 + hw * 0.6, cy + 14, 3.6), "#8C5E3C", ' opacity=".8"') +
          F(Ci(50 + hw * 0.4, cy + 20, 1.6), "#8C5E3C", ' opacity=".8"');
        break;
      case "glitter":
        for (const [x, y] of [
          [-0.6, -0.4],
          [0.6, -0.6],
          [-0.8, 0.5],
          [0.8, 0.4],
          [0.2, 1.2],
          [-0.3, 1.1],
        ])
          s += F(spark(50 + x * hw, cy + y * hr, 2), WH);
        break;
      case "folds":
        s +=
          F(P(`M50 0L50 110L100 110L100 0Z`), pal.s, ' opacity=".55"') +
          L(`M14 ${n(cy)}L50 ${Tp}L86 ${n(cy)}`, 1.4, pal.s);
        break;
      case "stitchpatch":
        s += `<rect x="${n(50 + hw * 0.36)}" y="${n(cy + 8)}" width="11" height="10" rx="2" fill="${E.tone(pal.b, 0.12)}" stroke="${INK}" stroke-width="1.4" stroke-dasharray="2 1.6"/>`;
        break;
      case "cheekmarks":
        s += L(
          `M${n(50 - f.ex)} ${n(f.ey + 4)}L${n(50 - f.ex - 2)} ${n(f.my + 2)}M${n(50 + f.ex)} ${n(f.ey + 4)}L${n(50 + f.ex + 2)} ${n(f.my + 2)}`,
          2.6,
          pal.d,
        );
        break;
      case "wattle":
        s += OL([El(52, f.my + 6, 2.6, 4)], "#E8574D");
        break;
      case "shine":
        s += F(
          El(50 - hw * 0.5, cy - hr * 0.6, hw * 0.2, hr * 0.12, -35),
          WH,
          ' opacity=".55"',
        );
        break;
      case "jaw":
        s += F(El(50, f.my + 9, hw * 0.92, 12.5), pal.l);
        break;
      case "scutes":
        spotsAt(6, 1.7, pal.s, "scutes");
        break;
      case "pleats":
        for (let x = 26; x <= 74; x += 6)
          s += L(`M${x} 58L${n(50 + (x - 50) * 0.8)} 112`, 1.8, pal.s);
        break;
      case "polka":
        spotsAt(8, 2.2, WH, "polka");
        break;
      default:
        break;
    }
  }
  // a small vinyl highlight on every body
  if (lod > 0 && !list.includes("shine"))
    s += F(
      El(50 - hw * 0.52, cy - hr * 0.62, hw * 0.13, hr * 0.075, -38),
      WH,
      ' opacity=".45"',
    );
  return s;
}

// ---------- faces ----------
const CLOSED = new Set(["sleepy", "happy", "squint"]);
export const EX: Record<string, Expression> = {
  smile: { e: "dot", m: "smile" },
  happy: { e: "happy", m: "grin" },
  cute: { e: "big", m: "cat", b: 1 },
  calm: { e: "sleepy", m: "smile" },
  sleepy: { e: "sleepy", m: "small" },
  yawn: { e: "sleepy", m: "o" },
  grumpy: { e: "dot", br: "angry", m: "frown" },
  fierce: { e: "dot", br: "angry", m: "fang" },
  brave: { e: "dot", br: "brave", m: "grin" },
  shy: { e: "dot", m: "small", b: 2 },
  surprised: { e: "wide", m: "o" },
  excited: { e: "star", m: "grin" },
  dizzy: { e: "spiral", m: "wobble" },
  nervous: { e: "wide", m: "wobble" },
  sneaky: { e: "half", m: "smirk" },
  smug: { e: "half", m: "smirk" },
  tongue: { e: "wink", m: "tongue" },
  silly: { e: "odd", m: "tongue" },
  wink: { e: "wink", m: "smile" },
  bored: { e: "half", m: "flat" },
  sad: { e: "dot", br: "sad", m: "frown" },
  love: { e: "heart", m: "grin" },
  open: { e: "dot", m: "grin" },
  quiet: { e: "sleepy", m: "small" },
  serious: { e: "dot", br: "flat", m: "flat" },
  spooky: { e: "wide", m: "o" },
  dreamy: { e: "big", m: "smile", b: 1 },
  confused: { e: "dot", br: "confused", m: "wobble" },
  sour: { e: "squint", m: "wobble" },
  sneezy: { e: "squint", m: "o" },
  whistle: { e: "sleepy", m: "whistle" },
  odd: { e: "odd", m: "grin" },
  hungry: { e: "big", m: "tongue" },
};
export const DEFAULT_EX: [string, number][] = [
  ["smile", 4],
  ["happy", 3],
  ["cute", 3],
  ["calm", 1.5],
  ["wink", 1],
  ["open", 1.5],
  ["smug", 0.8],
];

export function eye(
  kind: string,
  x: number,
  y: number,
  side: number,
  lod: number,
  onDark: boolean,
): string {
  const hl = (dx: number, dy: number, rr: number) =>
    lod > 0 ? F(Ci(x + dx, y + dy, rr), WH) : "";
  const base = onDark ? F(Ci(x, y, 5.2), WH) : "";
  switch (kind) {
    case "big":
      return (
        base +
        F(El(x, y, 4.2, 5), INK) +
        hl(-1.3, -1.8, 1.7) +
        hl(1.2, 1.6, 0.8)
      );
    case "happy":
      return L(
        `M${n(x - 4)} ${n(y + 1.5)}Q${n(x)} ${n(y - 3.6)} ${n(x + 4)} ${n(y + 1.5)}`,
        2.6,
        onDark ? WH : INK,
      );
    case "sleepy":
      return L(
        `M${n(x - 4)} ${n(y - 0.6)}Q${n(x)} ${n(y + 3.2)} ${n(x + 4)} ${n(y - 0.6)}`,
        2.6,
        onDark ? WH : INK,
      );
    case "wide":
      return (
        `<circle cx="${n(x)}" cy="${n(y)}" r="5.4" fill="${WH}" stroke="${INK}" stroke-width="1.8"/>` +
        F(Ci(x, y + 0.4, 2.7), INK) +
        hl(-0.9, -0.6, 0.9)
      );
    case "star":
      return F(P(star(x, y, 5.2, 5, 0.48)), onDark ? "#F6E27A" : INK);
    case "spiral":
      return L(
        `M${n(x)} ${n(y)}a.9 .9 0 0 1 1.8 0a1.8 1.8 0 0 1-3.6 0a2.7 2.7 0 0 1 5.4 0a3.6 3.6 0 0 1-7.2 0a4.5 4.5 0 0 1 9 0`,
        1.3,
        onDark ? WH : INK,
      );
    case "heart":
      return F(P(heart(x, y, 0.95)), "#E9574C");
    case "pixel":
      return (
        base +
        F(
          `<rect x="${n(x - 3)}" y="${n(y - 3.6)}" width="6" height="7.2"`,
          INK,
        ) +
        (lod > 0
          ? F(
              `<rect x="${n(x - 2)}" y="${n(y - 2.6)}" width="2" height="2"`,
              WH,
            )
          : "")
      );
    case "half":
      return (
        base +
        F(
          P(
            `M${n(x - 4.2)} ${n(y - 0.6)}A4.2 4.2 0 0 0 ${n(x + 4.2)} ${n(y - 0.6)}Z`,
          ),
          INK,
        ) +
        L(
          `M${n(x - 4.8)} ${n(y - 0.8)}L${n(x + 4.8)} ${n(y - 0.8)}`,
          2.2,
          onDark ? WH : INK,
        ) +
        hl(1.4 * side, 1.6, 0.9)
      );
    case "squint":
      return L(
        `M${n(x - 3.6 * side)} ${n(y - 3)}L${n(x + 3 * side)} ${n(y)}L${n(x - 3.6 * side)} ${n(y + 3)}`,
        2.4,
        onDark ? WH : INK,
      );
    case "ring":
      return (
        `<circle cx="${n(x)}" cy="${n(y)}" r="6.6" fill="${WH}" stroke="${INK}" stroke-width="2"/>` +
        F(Ci(x, y, 3.6), INK) +
        hl(-1.2, -1.3, 1.2)
      );
    case "lashes":
      return (
        base +
        F(Ci(x, y, 3.4), INK) +
        hl(-1.1, -1.2, 1.1) +
        L(
          `M${n(x + 3 * side)} ${n(y - 2.4)}L${n(x + 5.4 * side)} ${n(y - 4.4)}M${n(x + 3.6 * side)} ${n(y - 0.4)}L${n(x + 6.2 * side)} ${n(y - 1)}`,
          1.4,
        )
      );
    default:
      return base + F(Ci(x, y, 3.4), INK) + hl(-1.1, -1.2, 1.1);
  }
}
export function brows(kind: string, f: FacePts, onDark: boolean): string {
  const c = onDark ? WH : INK;
  const l = 50 - f.ex;
  const r = 50 + f.ex;
  const y = f.ey - 6.2;
  switch (kind) {
    case "angry":
      return L(
        `M${n(l - 4.4)} ${n(y - 1.6)}L${n(l + 3.6)} ${n(y + 1.6)}M${n(r + 4.4)} ${n(y - 1.6)}L${n(r - 3.6)} ${n(y + 1.6)}`,
        2.4,
        c,
      );
    case "sad":
      return L(
        `M${n(l - 4)} ${n(y + 1.2)}L${n(l + 3.6)} ${n(y - 1.6)}M${n(r + 4)} ${n(y + 1.2)}L${n(r - 3.6)} ${n(y - 1.6)}`,
        2.2,
        c,
      );
    case "brave":
      return L(
        `M${n(l - 4)} ${n(y - 1)}L${n(l + 3.6)} ${n(y + 0.8)}M${n(r + 4)} ${n(y - 1)}L${n(r - 3.6)} ${n(y + 0.8)}`,
        2.6,
        c,
      );
    case "flat":
      return L(
        `M${n(l - 3.8)} ${n(y)}L${n(l + 3.8)} ${n(y)}M${n(r - 3.8)} ${n(y)}L${n(r + 3.8)} ${n(y)}`,
        2.2,
        c,
      );
    case "confused":
      return L(
        `M${n(l - 3.8)} ${n(y + 0.6)}L${n(l + 3.8)} ${n(y + 0.6)}M${n(r - 3.6)} ${n(y - 0.6)}Q${n(r)} ${n(y - 3.6)} ${n(r + 3.6)} ${n(y - 1.2)}`,
        2.2,
        c,
      );
    default:
      return "";
  }
}
function mouth(kind: string, x: number, my: number, onDark: boolean): string {
  const c = onDark ? WH : INK;
  switch (kind) {
    case "grin":
      return (
        F(
          P(
            `M${n(x - 5.5)} ${n(my - 1.5)}Q${n(x)} ${n(my - 0.8)} ${n(x + 5.5)} ${n(my - 1.5)}Q${n(x + 5)} ${n(my + 7)} ${n(x)} ${n(my + 7)}Q${n(x - 5)} ${n(my + 7)} ${n(x - 5.5)} ${n(my - 1.5)}Z`,
          ),
          INK,
        ) +
        F(
          P(
            `M${n(x - 3.2)} ${n(my + 4.6)}Q${n(x)} ${n(my + 2.6)} ${n(x + 3.2)} ${n(my + 4.6)}Q${n(x + 1.6)} ${n(my + 6.4)} ${n(x)} ${n(my + 6.4)}Q${n(x - 1.6)} ${n(my + 6.4)} ${n(x - 3.2)} ${n(my + 4.6)}Z`,
          ),
          TONGUE,
        )
      );
    case "cat":
      return L(
        `M${n(x - 5)} ${n(my)}Q${n(x - 2.5)} ${n(my + 3.4)} ${n(x)} ${n(my)}Q${n(x + 2.5)} ${n(my + 3.4)} ${n(x + 5)} ${n(my)}`,
        2.2,
        c,
      );
    case "o":
      return F(El(x, my + 1.2, 2.6, 3.2), INK);
    case "whistle":
      return `<ellipse cx="${n(x + 1)}" cy="${n(my + 1)}" rx="1.8" ry="1.8" fill="none" stroke="${c}" stroke-width="2"/>`;
    case "flat":
      return L(
        `M${n(x - 3.5)} ${n(my + 1)}L${n(x + 3.5)} ${n(my + 1)}`,
        2.4,
        c,
      );
    case "frown":
      return L(
        `M${n(x - 4)} ${n(my + 2.6)}Q${n(x)} ${n(my - 1.2)} ${n(x + 4)} ${n(my + 2.6)}`,
        2.4,
        c,
      );
    case "smirk":
      return L(
        `M${n(x - 4)} ${n(my + 1)}Q${n(x + 1)} ${n(my + 3.4)} ${n(x + 4.6)} ${n(my - 1.2)}`,
        2.4,
        c,
      );
    case "small":
      return L(
        `M${n(x - 2.4)} ${n(my)}Q${n(x)} ${n(my + 2.4)} ${n(x + 2.4)} ${n(my)}`,
        2.2,
        c,
      );
    case "wobble":
      return L(
        `M${n(x - 5)} ${n(my + 1)}Q${n(x - 3.3)} ${n(my - 1)} ${n(x - 1.6)} ${n(my + 1)}Q${n(x)} ${n(my + 3)} ${n(x + 1.6)} ${n(my + 1)}Q${n(x + 3.3)} ${n(my - 1)} ${n(x + 5)} ${n(my + 1)}`,
        2,
        c,
      );
    case "tongue":
      return (
        `<path d="M${n(x - 0.6)} ${n(my + 1.2)}Q${n(x - 0.6)} ${n(my + 6.4)} ${n(x + 2)} ${n(my + 6.4)}Q${n(x + 4.6)} ${n(my + 6.4)} ${n(x + 4.6)} ${n(my + 1.2)}Z" fill="${TONGUE}" stroke="${INK}" stroke-width="1.6"/>` +
        L(
          `M${n(x - 4)} ${n(my)}Q${n(x)} ${n(my + 3.4)} ${n(x + 4)} ${n(my)}`,
          2.4,
          c,
        )
      );
    case "fang":
      return (
        `<path d="M${n(x + 0.6)} ${n(my + 1.6)}L${n(x + 3)} ${n(my + 1.2)}L${n(x + 1.9)} ${n(my + 4.4)}Z" fill="${WH}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
        L(
          `M${n(x - 4.4)} ${n(my)}Q${n(x)} ${n(my + 3)} ${n(x + 4.4)} ${n(my)}`,
          2.4,
          c,
        )
      );
    case "fangs":
      return (
        `<path d="M${n(x - 3.6)} ${n(my + 1.2)}L${n(x - 1.4)} ${n(my + 1.6)}L${n(x - 2.6)} ${n(my + 5)}ZM${n(x + 3.6)} ${n(my + 1.2)}L${n(x + 1.4)} ${n(my + 1.6)}L${n(x + 2.6)} ${n(my + 5)}Z" fill="${WH}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
        L(
          `M${n(x - 5)} ${n(my)}Q${n(x)} ${n(my + 3)} ${n(x + 5)} ${n(my)}`,
          2.4,
          c,
        )
      );
    case "teeth":
      return (
        `<path d="M${n(x - 2.2)} ${n(my + 0.6)}L${n(x + 2.2)} ${n(my + 0.6)}L${n(x + 2.2)} ${n(my + 4.6)}Q${n(x)} ${n(my + 5.2)} ${n(x - 2.2)} ${n(my + 4.6)}Z" fill="${WH}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
        L(`M${n(x)} ${n(my + 0.6)}L${n(x)} ${n(my + 4.6)}`, 1.2) +
        L(
          `M${n(x - 4)} ${n(my)}Q${n(x)} ${n(my + 1.6)} ${n(x + 4)} ${n(my)}`,
          2.2,
          c,
        )
      );
    case "sharp":
      return (
        F(
          P(
            `M${n(x - 8)} ${n(my - 1)}Q${n(x)} ${n(my)} ${n(x + 8)} ${n(my - 1)}Q${n(x + 6)} ${n(my + 8)} ${n(x)} ${n(my + 8)}Q${n(x - 6)} ${n(my + 8)} ${n(x - 8)} ${n(my - 1)}Z`,
          ),
          INK,
        ) +
        F(
          P(
            `M${n(x - 7)} ${n(my - 0.4)}L${n(x - 5.2)} ${n(my + 2.8)}L${n(x - 3.4)} ${n(my - 0.2)}L${n(x - 1.6)} ${n(my + 3)}L${n(x + 0.2)} ${n(my)}L${n(x + 2)} ${n(my + 3)}L${n(x + 3.8)} ${n(my - 0.2)}L${n(x + 5.6)} ${n(my + 2.8)}L${n(x + 7.2)} ${n(my - 0.4)}Z`,
          ),
          WH,
        )
      );
    case "grill":
      return (
        `<rect x="${n(x - 7)}" y="${n(my - 1)}" width="14" height="6" rx="2" fill="${WH}" stroke="${INK}" stroke-width="2"/>` +
        L(
          `M${n(x - 2.4)} ${n(my - 1)}L${n(x - 2.4)} ${n(my + 5)}M${n(x + 2.4)} ${n(my - 1)}L${n(x + 2.4)} ${n(my + 5)}`,
          1.4,
        )
      );
    case "forked":
      return (
        L(
          `M${n(x)} ${n(my + 1)}L${n(x)} ${n(my + 6)}M${n(x)} ${n(my + 6)}L${n(x - 2)} ${n(my + 9)}M${n(x)} ${n(my + 6)}L${n(x + 2)} ${n(my + 9)}`,
          1.8,
          "#E8574D",
        ) +
        L(
          `M${n(x - 4)} ${n(my)}Q${n(x)} ${n(my + 3)} ${n(x + 4)} ${n(my)}`,
          2.4,
          c,
        )
      );
    case "none":
      return "";
    default:
      return L(
        `M${n(x - 4)} ${n(my)}Q${n(x)} ${n(my + 4)} ${n(x + 4)} ${n(my)}`,
        2.4,
        c,
      );
  }
}

/** Face: carrier (muzzle, beak...), eyes, brows, mouth, cheeks. */
export function face(
  S: Shape,
  pal: Pal,
  k: FaceKit,
  ex: Expression,
  lod: number,
): string {
  const f = { ...S.face, ...(k.faceAt || {}) };
  const onDark = pal.dark || !!k.eyeBase;
  let s = "";
  let my = f.my;
  const mx = 50;
  let mth = ex.m;
  let after = "";
  const nose = (y: number, col = INK, w = 3.4) =>
    F(
      P(
        `M${n(50 - w)} ${n(y - 1.6)}Q50 ${n(y - 3.6)} ${n(50 + w)} ${n(y - 1.6)}Q${n(50 + w - 0.4)} ${n(y + 1.4)} 50 ${n(y + 2)}Q${n(50 - w + 0.4)} ${n(y + 1.4)} ${n(50 - w)} ${n(y - 1.6)}Z`,
      ),
      col,
    ) + (lod > 0 ? F(El(49, y - 1.6, 1.1, 0.6), WH, ' opacity=".7"') : "");
  const whisk = () =>
    lod > 0
      ? L(
          `M${n(50 - f.ex - 4)} ${n(my - 2)}L${n(50 - f.ex - 13)} ${n(my - 4)}M${n(50 - f.ex - 4)} ${n(my + 1)}L${n(50 - f.ex - 13)} ${n(my + 2)}M${n(50 + f.ex + 4)} ${n(my - 2)}L${n(50 + f.ex + 13)} ${n(my - 4)}M${n(50 + f.ex + 4)} ${n(my + 1)}L${n(50 + f.ex + 13)} ${n(my + 2)}`,
          1.3,
          pal.dark ? WH : INK,
        )
      : "";
  switch (k.f) {
    case "cat":
      s += F(
        P(
          `M47.8 ${n(my - 4.4)}L52.2 ${n(my - 4.4)}Q51.2 ${n(my - 1.8)} 50 ${n(my - 1.6)}Q48.8 ${n(my - 1.8)} 47.8 ${n(my - 4.4)}Z`,
        ),
        "#EF7FA2",
      );
      after += whisk();
      if (mth === "smile" || mth === "small") mth = "cat";
      my += 0.4;
      break;
    case "mouse":
      s += F(Ci(50, my - 3.6, 2.2), "#EF7FA2");
      after += whisk();
      if (mth === "smile") mth = "cat";
      break;
    case "muzzle":
    case "rednose":
    case "rhino":
      s += F(El(50, my - 0.6, 9.6, 7.2), pal.l);
      if (k.f === "rhino")
        s += OL(
          [P(`M46.5 ${n(my - 5)}Q50 ${n(my - 19)} 53.5 ${n(my - 6)}Z`)],
          BONE,
        );
      s +=
        k.f === "rednose"
          ? OL([Ci(50, my - 4.4, 3.4)], "#E8574D")
          : nose(my - 3.6);
      my += 1.6;
      break;
    case "koalanose":
      s +=
        F(El(50, my - 3, 4.6, 5.6), "#3E4556") +
        F(El(48.6, my - 5, 1.2, 1.4), WH, ' opacity=".6"');
      my += 2.4;
      break;
    case "wombatnose":
      s += F(El(50, my - 3.4, 6, 4.2), "#3E4556");
      my += 2;
      break;
    case "bunny":
      s += F(
        P(`M48.2 ${n(my - 4.2)}L51.8 ${n(my - 4.2)}L50 ${n(my - 2)}Z`),
        "#EF7FA2",
      );
      if (mth === "smile" || mth === "small") mth = "teeth";
      break;
    case "beaver":
      s += nose(my - 4, INK, 3);
      mth = mth === "smile" || mth === "small" ? "teeth" : mth;
      my += 0.6;
      break;
    case "snout":
    case "hippo": {
      const w = k.f === "hippo" ? 12 : 7.6;
      s += `<ellipse cx="50" cy="${n(my - 2)}" rx="${w}" ry="${k.f === "hippo" ? 7.6 : 5.6}" fill="${E.tone(pal.b, -0.06)}" stroke="${INK}" stroke-width="1.8"/>`;
      s +=
        F(El(50 - w * 0.36, my - 2, 1.2, 2.1), INK) +
        F(El(50 + w * 0.36, my - 2, 1.2, 2.1), INK);
      my += k.f === "hippo" ? 8.4 : 6.4;
      if (mth === "grin" || mth === "tongue") mth = "small";
      break;
    }
    case "capy":
      s +=
        `<rect x="40" y="${n(my - 8)}" width="20" height="13" rx="6.5" fill="${E.tone(pal.b, -0.16)}"/>` +
        F(El(45.6, my - 4.4, 1.3, 1.9), INK) +
        F(El(54.4, my - 4.4, 1.3, 1.9), INK);
      my += 1.6;
      mth = mth === "grin" ? "smile" : mth;
      break;
    case "trunk":
    case "mammoth":
      after +=
        OL(
          [
            P(
              `M46 ${n(f.ey + 2)}Q46 ${n(my + 6)} 41 ${n(my + 12)}Q39 ${n(my + 17)} 44 ${n(my + 16)}Q48 ${n(my + 12)} 54 ${n(f.ey + 2)}Z`,
            ),
          ],
          pal.b,
        ) +
        L(
          `M45 ${n(my + 4)}L48.6 ${n(my + 4)}M44 ${n(my + 8)}L47 ${n(my + 9)}`,
          1.4,
          pal.s,
        );
      if (k.f === "mammoth")
        s += OL(
          [
            P(
              `M41 ${n(my + 2)}Q34 ${n(my + 12)} 40 ${n(my + 18)}Q37 ${n(my + 10)} 44 ${n(my + 4)}Z`,
            ),
            P(
              `M59 ${n(my + 2)}Q66 ${n(my + 12)} 60 ${n(my + 18)}Q63 ${n(my + 10)} 56 ${n(my + 4)}Z`,
            ),
          ],
          BONE,
        );
      mth = "none";
      break;
    case "beak":
      after += OL(
        [
          P(
            `M44.6 ${n(my - 5)}Q50 ${n(my - 7)} 55.4 ${n(my - 5)}Q53.4 ${n(my + 0.6)} 50 ${n(my + 3)}Q46.6 ${n(my + 0.6)} 44.6 ${n(my - 5)}Z`,
          ),
        ],
        BEAK,
      );
      mth = mth === "o" ? "none" : "none";
      break;
    case "bill":
      after +=
        OL(
          [
            P(
              `M41 ${n(my - 4)}Q50 ${n(my - 8.6)} 59 ${n(my - 4)}Q61 ${n(my + 2.4)} 50 ${n(my + 3.4)}Q39 ${n(my + 2.4)} 41 ${n(my - 4)}Z`,
            ),
          ],
          BEAK,
        ) +
        L(
          `M42.6 ${n(my - 0.6)}Q50 ${n(my + 1)} 57.4 ${n(my - 0.6)}`,
          1.4,
          "#C9762A",
        );
      mth = "none";
      break;
    case "hook":
      after += OL(
        [
          P(
            `M44.6 ${n(my - 6)}Q50 ${n(my - 8)} 55.4 ${n(my - 6)}Q57 ${n(my + 1)} 51 ${n(my + 6)}Q51.4 ${n(my + 1)} 47 ${n(my)}Q44 ${n(my - 2)} 44.6 ${n(my - 6)}Z`,
          ),
        ],
        "#F2C14E",
      );
      mth = "none";
      break;
    case "bigbeak":
      after +=
        OL(
          [
            P(
              `M43 ${n(my - 6)}Q50 ${n(my - 10)} 57 ${n(my - 6)}Q70 ${n(my + 1)} 67 ${n(my + 13)}Q61 ${n(my + 4)} 50 ${n(my + 2)}Q43 ${n(my)} 43 ${n(my - 6)}Z`,
            ),
          ],
          "#F79A3C",
        ) +
        F(
          P(
            `M60.6 ${n(my + 2)}Q66 ${n(my + 4)} 67 ${n(my + 13)}Q63.4 ${n(my + 6)} 58 ${n(my + 4)}Z`,
          ),
          INK,
        );
      mth = "none";
      break;
    case "longbeak":
      after += OLL(
        `M50 ${n(my - 4)}Q52 ${n(my + 5)} 61 ${n(my + 11)}`,
        3.2,
        k.beak || "#2D3240",
      );
      mth = "none";
      break;
    case "puffinbeak":
      after +=
        OL(
          [
            P(
              `M44 ${n(my - 6)}Q50 ${n(my - 9)} 56 ${n(my - 6)}L50 ${n(my + 6)}Z`,
            ),
          ],
          "#F2683C",
        ) + L(`M46 ${n(my - 4.6)}L54 ${n(my - 4.6)}`, 1.8, "#F8D35B");
      mth = "none";
      break;
    case "flamingo":
      after +=
        OL(
          [
            P(
              `M45 ${n(my - 5)}Q50 ${n(my - 7)} 55 ${n(my - 5)}Q55 ${n(my + 2)} 52 ${n(my + 6)}Q50 ${n(my + 2)} 45 ${n(my - 5)}Z`,
            ),
          ],
          "#FBE3EC",
        ) +
        F(
          P(
            `M52 ${n(my + 6)}Q54 ${n(my + 2)} 54.2 ${n(my)}L50.6 ${n(my + 2.4)}Z`,
          ),
          INK,
        );
      mth = "none";
      break;
    case "dodobeak":
      after += OL(
        [
          P(
            `M45 ${n(my - 6)}Q50 ${n(my - 8)} 55 ${n(my - 6)}Q60 ${n(my + 2)} 54 ${n(my + 8)}Q50 ${n(my + 4)} 46 ${n(my)}Z`,
          ),
        ],
        "#E9C16A",
      );
      mth = "none";
      break;
    case "seal":
      s += nose(my - 4, INK, 3);
      after += whisk();
      break;
    case "walrus":
      s +=
        F(El(44, my - 1, 6.6, 5), pal.l) +
        F(El(56, my - 1, 6.6, 5), pal.l) +
        nose(my - 5, INK, 2.8);
      after += OL(
        [
          P(`M44.6 ${n(my + 2)}L46 ${n(my + 14)}L48 ${n(my + 3)}Z`),
          P(`M55.4 ${n(my + 2)}L54 ${n(my + 14)}L52 ${n(my + 3)}Z`),
        ],
        BONE,
      );
      mth = "none";
      break;
    case "carrotnose":
      after += OL(
        [P(`M48.6 ${n(my - 6)}L59 ${n(my - 3)}L48.6 ${n(my - 1)}Z`)],
        "#F39A4C",
      );
      my += 2;
      break;
    case "tengunose":
      after += OL(
        [
          P(
            `M47.6 ${n(my - 5)}Q52 ${n(my - 20)} 58 ${n(my - 18)}Q54 ${n(my - 12)} 52.4 ${n(my - 4)}Z`,
          ),
        ],
        E.tone(pal.b, -0.06),
      );
      my += 1;
      break;
    case "longsnout":
      after += OL(
        [`<rect x="46" y="${n(my - 4)}" width="8" height="12" rx="4"`],
        pal.s,
      );
      mth = "none";
      break;
    case "koiwhiskers":
      after += L(
        `M46 ${n(my)}Q40 ${n(my + 2)} 39 ${n(my + 8)}M54 ${n(my)}Q60 ${n(my + 2)} 61 ${n(my + 8)}`,
        1.6,
      );
      break;
    case "sharp":
      mth = "sharp";
      break;
    case "anteater":
      after +=
        OL(
          [
            P(
              `M45.4 ${n(f.ey + 1)}Q44.6 ${n(my + 6)} 47.6 ${n(my + 15)}L52.4 ${n(my + 15)}Q55.4 ${n(my + 6)} 54.6 ${n(f.ey + 1)}Z`,
            ),
          ],
          pal.b,
        ) + F(El(50, my + 15, 3, 1.8), INK);
      mth = "none";
      break;
    case "croc":
    case "gator": {
      const gator = k.f === "gator";
      const w = S.h.hw * (gator ? 0.74 : 0.64);
      const y0 = my - 9;
      const hgt = gator ? 23 : 24;
      const wt = w * (gator ? 0.9 : 0.78);
      const sn = E.mixc(pal.b, "#F4F0C4", 0.3);
      s += OL(
        [
          P(
            `M${n(50 - wt)} ${n(y0 + 6)}Q${n(50 - wt)} ${n(y0)} ${n(50 - wt + 6)} ${n(y0)}L${n(50 + wt - 6)} ${n(y0)}Q${n(50 + wt)} ${n(y0)} ${n(50 + wt)} ${n(y0 + 6)}L${n(50 + w)} ${n(y0 + hgt - 8)}Q${n(50 + w)} ${n(y0 + hgt)} ${n(50 + w - 8)} ${n(y0 + hgt)}L${n(50 - w + 8)} ${n(y0 + hgt)}Q${n(50 - w)} ${n(y0 + hgt)} ${n(50 - w)} ${n(y0 + hgt - 8)}Z`,
          ),
          Ci(45, y0 + 0.4, 3.4),
          Ci(55, y0 + 0.4, 3.4),
        ],
        sn,
      );
      s +=
        F(El(45, y0 + 0.2, 1.5, 1.1), INK) + F(El(55, y0 + 0.2, 1.5, 1.1), INK);
      const ly = y0 + 13;
      const x0 = 50 - w + 3;
      const x1 = 50 + w - 3;
      let teeth = "";
      const nT = gator ? 6 : 8;
      for (let i = 0; i < nT; i++) {
        const x = x0 + 2.6 + ((x1 - x0 - 5.2) * i) / (nT - 1);
        const yy = ly + 1.6 * Math.sin((Math.PI * (x - x0)) / (x1 - x0));
        teeth +=
          i % 2 === 0
            ? `M${n(x - 2.4)} ${n(yy)}L${n(x)} ${n(yy + 5)}L${n(x + 2.4)} ${n(yy)}Z`
            : `M${n(x - 2.4)} ${n(yy)}L${n(x)} ${n(yy - 4.6)}L${n(x + 2.4)} ${n(yy)}Z`;
      }
      after +=
        `<path d="${teeth}" fill="${WH}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>` +
        L(
          `M${n(x0 - 1)} ${n(ly - 2.6)}Q${n(x0 + 1)} ${n(ly)} ${n(x0 + 3)} ${n(ly)}Q50 ${n(ly + 3.2)} ${n(x1 - 3)} ${n(ly)}Q${n(x1 - 1)} ${n(ly)} ${n(x1 + 1)} ${n(ly - 2.6)}`,
          2.2,
        );
      mth = "none";
      break;
    }
    default:
      break;
  }
  if (k.o && ["smile", "small", "cat"].includes(mth)) mth = k.o;
  if (k.forceMouth) mth = k.forceMouth;

  // eyes
  let ek = ex.e;
  // kit eyes (owl rings, robot pixels, spider, cyclops) unless the adjective asks for another look
  let extraSpider = false;
  if (k.x === "mono") ek = "mono";
  else if (k.x === "spider") {
    if (["dot", "big"].includes(ek)) ek = "spider";
    else extraSpider = true;
  } else if (k.x && ["dot", "big"].includes(ek)) ek = k.x;
  if (k.noEyes) ek = "none";
  if (ek === "mono") {
    // one big eye that still follows the expression
    const e1 = ex.e === "wink" ? "happy" : ex.e;
    if (CLOSED.has(e1))
      s +=
        `<circle cx="50" cy="${n(f.ey - 1)}" r="9" fill="${pal.b}" stroke="${INK}" stroke-width="2.2"/>` +
        G(
          `translate(50 ${n(f.ey - 1)}) scale(1.6) translate(-50 ${n(-(f.ey - 1))})`,
          eye(e1, 50, f.ey - 1, 1, lod, false),
        );
    else
      s +=
        `<circle cx="50" cy="${n(f.ey - 1)}" r="9" fill="${WH}" stroke="${INK}" stroke-width="2.2"/>` +
        (["dot", "big", "mono"].includes(e1) || !e1
          ? F(Ci(50, f.ey - 0.4, 4.6), INK) +
            (lod > 0 ? F(Ci(48.4, f.ey - 2.6, 1.7), WH) : "")
          : G(
              `translate(50 ${n(f.ey - 1)}) scale(1.3) translate(-50 ${n(-(f.ey - 1))})`,
              eye(e1 === "odd" ? "wide" : e1, 50, f.ey - 1, 1, lod, false),
            ));
  }
  if (extraSpider) {
    for (const [dx, dy, rr] of [
      [-f.ex * 0.45, -6, 2.2],
      [f.ex * 0.45, -6, 2.2],
      [-f.ex * 1.35, -4, 1.8],
      [f.ex * 1.35, -4, 1.8],
    ])
      s +=
        F(Ci(50 + dx, f.ey + dy, rr + 1.6), WH) +
        F(Ci(50 + dx, f.ey + dy, rr), INK);
  }
  if (ek === "mono") {
  } else if (ek === "spider") {
    for (const [dx, dy, rr] of [
      [-f.ex, 0, 3.4],
      [f.ex, 0, 3.4],
      [-f.ex * 0.45, -6, 2.2],
      [f.ex * 0.45, -6, 2.2],
      [-f.ex * 1.35, -4, 1.8],
      [f.ex * 1.35, -4, 1.8],
    ]) {
      s +=
        F(Ci(50 + dx, f.ey + dy, rr + 1.6), WH) +
        F(Ci(50 + dx, f.ey + dy, rr), INK);
    }
  } else if (ek === "wink") {
    s +=
      eye("dot", 50 - f.ex, f.ey, -1, lod, onDark) +
      eye("happy", 50 + f.ex, f.ey, 1, lod, onDark);
  } else if (ek === "odd") {
    s +=
      eye("wide", 50 - f.ex, f.ey - 0.6, -1, lod, onDark) +
      eye("dot", 50 + f.ex, f.ey, 1, lod, onDark);
  } else if (ek !== "none") {
    s +=
      eye(ek, 50 - f.ex, f.ey, -1, lod, onDark) +
      eye(ek, 50 + f.ex, f.ey, 1, lod, onDark);
  }
  if (ex.br && lod > 0 && !k.stalks) s += brows(ex.br, f, pal.dark);
  if ((ex.b || k.blush) && lod > 0 && !pal.dark) {
    const o = ex.b === 2 ? 0.75 : 0.5;
    s +=
      F(El(50 - f.ex - 5.6, f.ey + 5.6, 3.8, 2.4), BLUSH, ` opacity="${o}"`) +
      F(El(50 + f.ex + 5.6, f.ey + 5.6, 3.8, 2.4), BLUSH, ` opacity="${o}"`);
  }
  if (k.cheekpuffs)
    s +=
      F(El(50 - f.ex - 6, f.my + 1, 6, 4.6), pal.l) +
      F(El(50 + f.ex + 6, f.my + 1, 6, 4.6), pal.l);
  s += mouth(mth, mx, my, pal.dark && !k.f);
  return s + after;
}

// ---------- things to wear ----------
// Slots: head, eyes, face, neck, side. Hats are drawn for a 28-unit head and scaled.
export const WEAR: Record<string, Wear> = {
  crown: {
    slot: "head",
    up: 21,
    d: () =>
      OL([P("M-15 4L-15-14L-7.6-5L0-18L7.6-5L15-14L15 4Q0 7-15 4Z")], GOLD) +
      OL([Ci(-15, -15, 2.4), Ci(0, -19, 2.6), Ci(15, -15, 2.4)], GOLD) +
      F(Ci(0, -2, 2.4), "#E8574D") +
      F(Ci(-8.6, -1, 1.6), "#72B4F2") +
      F(Ci(8.6, -1, 1.6), "#72B4F2"),
  },
  tiara: {
    slot: "head",
    up: 15,
    d: () =>
      OL(
        [
          P("M-18 7Q0-5 18 7L16 10Q0 0-16 10Z"),
          P("M-6 1L0-12L6 1Z"),
          P("M-14 4L-11-4L-7.6 2Z"),
          P("M14 4L11-4L7.6 2Z"),
        ],
        "#E3E7EE",
      ) +
      OL([Ci(0, -2.6, 2.8)], "#F38FAA") +
      F(Ci(-11, 1.4, 1.2), "#72B4F2") +
      F(Ci(11, 1.4, 1.2), "#72B4F2"),
  },
  tophat: {
    slot: "head",
    up: 27,
    d: (o) =>
      OL([El(0, 3, 22, 4.6), P("M-13 3L-12-24Q0-27 12-24L13 3Z")], "#2D3240") +
      F(
        `<rect x="-12.4" y="-6" width="24.8" height="5"`,
        o.alt ? "#8F70DB" : "#E8574D",
      ),
  },
  captain: {
    slot: "head",
    up: 16,
    d: () =>
      OL([P("M-18 2Q-19-14 0-16Q19-14 18 2Z")], WH) +
      F(`<rect x="-18" y="-3.6" width="36" height="5.6"`, "#34476E") +
      OL([P("M-16 2Q0 10 16 2Q0 5-16 2Z")], "#2D3240") +
      OL([Ci(0, -6, 3)], GOLD),
  },
  military: {
    slot: "head",
    up: 16,
    d: () =>
      OL([El(0, -9, 21, 6.4), P("M-14-8L14-8L13 2L-13 2Z")], "#6D7A4E") +
      OL([P("M-15 2Q0 10 15 2Q0 5-15 2Z")], "#2D3240") +
      F(P(star(0, -4, 3.6)), GOLD),
  },
  mortarboard: {
    slot: "head",
    up: 15,
    d: () =>
      OL([P("M-13-6L-13 3Q0 7 13 3L13-6Z")], "#2D3240") +
      OL([P("M0-15L25-8.4L0-2L-25-8.4Z")], "#2D3240") +
      L("M0-8.6L17-6L18 6", 1.6, GOLD) +
      OL([El(18, 8, 2, 3.4)], GOLD),
  },
  judgewig: {
    slot: "head",
    up: 16,
    d: () =>
      OL(
        [
          Ci(-23, 8, 7),
          Ci(-16, -3, 8),
          Ci(-5, -7, 8),
          Ci(6, -7, 8),
          Ci(17, -3, 8),
          Ci(24, 8, 7),
          Ci(-28, 20, 6.4),
          Ci(28, 20, 6.4),
          Ci(-28, 32, 6.4),
          Ci(28, 32, 6.4),
        ],
        "#F4F1EA",
      ),
  },
  cowboy: {
    slot: "head",
    up: 22,
    d: () =>
      OL(
        [
          P("M-31 1Q-29-6-16-4Q0-1 16-4Q29-6 31 1Q24 7 0 6Q-24 7-31 1Z"),
          P("M-14-2Q-15-20-6-21Q0-17 6-21Q15-20 14-2Z"),
        ],
        "#B5835A",
      ) + F(`<rect x="-14.4" y="-6" width="28.8" height="3.6"`, "#6E4B37"),
  },
  deerstalker: {
    slot: "head",
    up: 20,
    d: () =>
      OL(
        [P("M-19 5Q-20-17 0-19Q20-17 19 5Z"), P("M-8 5Q0 10 8 5Z")],
        "#B9935F",
      ) +
      L(
        "M-12-12L-14 4M-4-17L-5 5M5-17L5 5M13-12L14 4M-19-4L19-4M-17-12L17-12",
        1.2,
        "#8C6A3C",
      ) +
      OL([Ci(0, -19, 2.4)], "#8C6A3C"),
  },
  nemes: {
    slot: "head",
    up: 16,
    front: 1,
    d: () =>
      OL(
        [
          P(
            "M-21 0Q-22-15 0-16Q22-15 21 0L31 38L19 38L17 6L-17 6L-19 38L-31 38Z",
          ),
        ],
        "#F2C14E",
      ) +
      L(
        "M-25 14L-17 14M-27 22L-18 22M-29 30L-18.6 30M25 14L17 14M27 22L18 22M29 30L18.6 30M-20-6L20-6",
        3,
        "#34476E",
      ) +
      F(`<rect x="-18" y="2" width="36" height="5"`, "#34476E"),
  },
  kabuto: {
    slot: "head",
    up: 26,
    d: () =>
      OL([P("M-22 6Q-23-16 0-17Q23-16 22 6L28 12L-28 12Z")], "#34476E") +
      OL([P("M-17-26Q-12-8 0-8Q12-8 17-26Q10-12 0-12Q-10-12-17-26Z")], GOLD) +
      L("M-24 9L24 9", 1.4, "#5D6E99"),
  },
  headband: {
    slot: "head",
    up: 4,
    d: (o) =>
      OL(
        [
          P("M-28 10Q0 2 28 10L28 16Q0 8-28 16Z"),
          P("M26 12L38 8L36 14L40 20L28 15Z"),
        ],
        o.alt || "#E8574D",
      ),
  },
  laurel: {
    slot: "head",
    up: 8,
    d: () => {
      let s = "";
      for (let k = 0; k < 5; k++) {
        const a = -150 + k * 15;
        const x = 24 * Math.cos((a * Math.PI) / 180);
        const y = 10 + 18 * Math.sin((a * Math.PI) / 180);
        s +=
          F(El(x, y, 2.4, 4.6, a + 120), "#6CC487") +
          F(El(-x, y, 2.4, 4.6, -(a + 120)), "#6CC487");
      }
      return `<g stroke="${INK}" stroke-width="1.6">${s}</g>`;
    },
  },
  knight: {
    slot: "head",
    up: 30,
    d: () =>
      OL(
        [P("M-22 14Q-23-16 0-17Q23-16 22 14L16 14L16 2L-16 2L-16 14Z")],
        "#CDD3DD",
      ) +
      OL([P("M-3-16Q-2-28 10-30Q6-24 6-16Z")], "#E8574D") +
      L("M0-16L0 2", 1.6, "#9AA3B2"),
  },
  halo: {
    slot: "head",
    up: 18,
    d: () =>
      `<ellipse cx="0" cy="-12" rx="16" ry="4.4" fill="none" stroke="${INK}" stroke-width="${2.8 + SW * 2}"/><ellipse cx="0" cy="-12" rx="16" ry="4.4" fill="none" stroke="${GOLD}" stroke-width="2.8"/>`,
  },
  goggles: {
    slot: "head",
    up: 4,
    d: () =>
      OL([P("M-28 9Q0 2 28 9L28 13Q0 6-28 13Z")], "#6E4B37") +
      OL([Ci(-8.6, 8, 6.4), Ci(8.6, 8, 6.4)], "#9AA3B2") +
      F(Ci(-8.6, 8, 4.4), "#BFE3EA") +
      F(Ci(8.6, 8, 4.4), "#BFE3EA") +
      F(El(-10, 6.6, 1.4, 1), WH) +
      F(El(7.2, 6.6, 1.4, 1), WH),
  },
  headphones: {
    slot: "head",
    up: 6,
    d: (o) =>
      OLL("M-27 16Q-27-8 0-8Q27-8 27 16", 3.2, "#3E4556") +
      OL(
        [
          `<rect x="-34" y="10" width="10" height="16" rx="5"`,
          `<rect x="24" y="10" width="10" height="16" rx="5"`,
        ],
        o.alt || "#72B4F2",
      ),
  },
  beret: {
    slot: "head",
    up: 14,
    d: (o) =>
      OL([P("M-23 2Q-25-12-4-12Q18-12 21-2Q8 4-23 2Z")], o.alt || "#E8574D") +
      OLL("M-2-12L-1-16", 2.4, o.alt || "#E8574D"),
  },
  bow: {
    slot: "side",
    pin: "right",
    c: [16, -2],
    up: 10,
    d: (o) =>
      G(
        "translate(16 -2) rotate(14)",
        OL(
          [P("M0 0L-11-7Q-13 0-11 7Z"), P("M0 0L11-7Q13 0 11 7Z")],
          o.alt || "#F38FAA",
        ) + OL([Ci(0, 0, 3)], E.tone(o.alt || "#F38FAA", -0.12)),
      ),
  },
  cap: {
    slot: "head",
    up: 14,
    d: (o) =>
      OL([P("M-20 6Q-21-14 0-15Q21-14 20 6Z")], o.alt || "#4F86E0") +
      OL([P("M-20 5Q0 15 22 5Q0 8-20 5Z")], E.tone(o.alt || "#4F86E0", -0.18)) +
      OL([Ci(0, -14.6, 2)], E.tone(o.alt || "#4F86E0", -0.18)),
  },
  toque: {
    slot: "head",
    up: 26,
    d: () =>
      OL(
        [
          Ci(-9, -12, 9),
          Ci(0, -17, 10),
          Ci(9, -12, 9),
          P("M-14-8L14-8L14 4L-14 4Z"),
        ],
        WH,
      ) + L("M-14-2L14-2", 1.2, "#D7DDE8"),
  },
  bakerhat: {
    slot: "head",
    up: 14,
    d: () =>
      OL(
        [
          Ci(-7, -6, 7),
          Ci(0, -9, 8),
          Ci(7, -6, 7),
          P("M-12-4L12-4L12 4L-12 4Z"),
        ],
        WH,
      ),
  },
  wizard: {
    slot: "head",
    up: 36,
    d: () =>
      OL([El(0, 2, 24, 5)], "#6B4FB8") +
      OL([P("M-15 2Q-6-18 4-34Q6-36 8-33Q6-14 15 2Z")], "#8F70DB") +
      F(P(star(-3, -10, 3)), GOLD) +
      F(P(star(5, -20, 2.2)), GOLD) +
      F(P(star(6, -4, 1.8)), GOLD),
  },
  pirate: {
    slot: "head",
    up: 18,
    d: () =>
      OL([P("M-25-1Q-17-19 0-16Q17-19 25-1Q12 3 0 1Q-12 3-25-1Z")], "#2D3240") +
      F(Ci(0, -8, 3.4), WH) +
      L("M-4-3L4-3", 1.6, WH),
  },
  viking: {
    slot: "head",
    up: 22,
    d: () =>
      OL(
        [
          P("M-18-3Q-30-6-30-22Q-24-11-16-10Z"),
          P("M18-3Q30-6 30-22Q24-11 16-10Z"),
        ],
        BONE,
      ) +
      OL([P("M-21 7Q-21-16 0-17Q21-16 21 7Z")], "#AFB6C3") +
      F(`<rect x="-21" y="2" width="42" height="5"`, "#A06F4C") +
      F(Ci(-10, -6, 1.2), "#6E788A") +
      F(Ci(0, -9, 1.2), "#6E788A") +
      F(Ci(10, -6, 1.2), "#6E788A"),
  },
  hardhat: {
    slot: "head",
    up: 18,
    d: (o) =>
      OL(
        [P("M-20 4Q-20-16 0-17Q20-16 20 4Z"), P("M-25 3L25 3L25 8L-25 8Z")],
        o.alt || "#F8D35B",
      ) +
      L("M0-17L0 3", 3, E.tone(o.alt || "#F8D35B", -0.12)) +
      (o.lamp ? OL([Ci(0, -6, 4.4)], "#FFF6CC") : "") +
      (o.badge ? OL([P("M0-12L5-9L4-2L0 0L-4-2L-5-9Z")], GOLD) : ""),
  },
  safari: {
    slot: "head",
    up: 18,
    d: () =>
      OL([El(0, 2, 27, 5.4), P("M-15 2Q-16-17 0-18Q16-17 15 2Z")], "#D9C08E") +
      F(`<rect x="-15" y="-4" width="30" height="4"`, "#8C6A3C"),
  },
  sailorcap: {
    slot: "head",
    up: 12,
    d: () =>
      OL([P("M-20 4Q-22-10 0-12Q22-10 20 4Q0 0-20 4Z")], WH) +
      F(P("M-19 0Q0-4 19 0L19.6 3.2Q0-1-19.6 3.2Z"), "#34476E"),
  },
  fedora: {
    slot: "head",
    up: 18,
    d: () =>
      OL(
        [
          P("M-26 2Q0-3 26 2Q20 7 0 6Q-20 7-26 2Z"),
          P("M-15 1Q-16-16-4-17Q0-14 4-17Q16-16 15 1Z"),
        ],
        "#5D6676",
      ) + F(`<rect x="-15" y="-4" width="30" height="4"`, "#2D3240"),
  },
  party: {
    slot: "head",
    up: 30,
    d: () =>
      G(
        "rotate(12)",
        OL([P("M-11 3L0-25L11 3Z")], "#72B4F2") +
          F(P("M-7.6-6L-4.4-14L6.6-9.4L7.6-6Z"), "#F8D35B") +
          F(P("M-10.4 1.4L-9-3.2L9.2 1.4Z"), "#F38FAA") +
          OL([Ci(0, -26, 3.6)], "#F38FAA"),
      ),
  },
  beanie: {
    slot: "head",
    up: 22,
    d: (o) =>
      OL([P("M-21 6Q-21-15 0-16Q21-15 21 6Z")], o.alt || "#E8574D") +
      OL(
        [`<rect x="-23" y="-1" width="46" height="9" rx="3"`],
        E.tone(o.alt || "#E8574D", -0.1),
      ) +
      L(
        "M-17 1L-17 6M-11 1L-11 6M-5 1L-5 6M1 1L1 6M7 1L7 6M13 1L13 6M19 1L19 6",
        1.2,
        E.tone(o.alt || "#E8574D", -0.25),
      ) +
      OL([Ci(0, -17, 5.4)], WH),
  },
  sleepcap: {
    slot: "head",
    up: 18,
    d: () =>
      OL(
        [P("M-21 6Q-20-12 0-14Q14-14 26-2Q30 4 32 14Q24 8 18 4Q10 6-21 6Z")],
        "#72B4F2",
      ) +
      OL([`<rect x="-22" y="1" width="44" height="7" rx="3.5"`], WH) +
      OL([Ci(32, 15, 3.6)], WH) +
      F(P(star(-6, -6, 2.2)), "#F6E27A") +
      F(P(star(8, -4, 1.6)), "#F6E27A"),
  },
  curl: {
    slot: "head",
    up: 10,
    d: () => L("M0 4C-2-6 8-10 8-3C8 1 2 2 2-2", 2.6),
  },
  headset: {
    slot: "head",
    up: 6,
    d: () =>
      OLL("M-27 16Q-27-6 0-6Q27-6 27 16", 2, "#3E4556") +
      OL([`<rect x="-32" y="10" width="8" height="13" rx="4"`], "#F38FAA") +
      L("M-28 20Q-24 34-8 36", 1.8) +
      OL([Ci(-7, 36, 2.4)], "#3E4556") +
      OL([P(star(18, -4, 4.4))], GOLD),
  },
  gnomehat: {
    slot: "head",
    up: 32,
    d: () =>
      OL(
        [P("M-23 6Q-20-8-8-22Q2-34 18-30Q10-26 8-18Q14-6 23 6Q0 10-23 6Z")],
        "#E8574D",
      ),
  },
  pilotcap: {
    slot: "head",
    up: 16,
    d: () =>
      OL(
        [P("M-22 10Q-23-15 0-16Q23-15 22 10L18 14Q20-2 0-3Q-20-2-18 14Z")],
        "#8C5E3C",
      ) +
      OL([Ci(-8.6, 1, 6.4), Ci(8.6, 1, 6.4)], "#9AA3B2") +
      F(Ci(-8.6, 1, 4.4), "#BFE3EA") +
      F(Ci(8.6, 1, 4.4), "#BFE3EA"),
  },
  astronaut: { slot: "head", up: 10, special: "bubble", d: () => "" },
  // eyes
  shades: {
    slot: "eyes",
    d: (o, f) =>
      OL(
        [
          P(
            `M${n(-f.ex - 6)} -3.6L${n(-f.ex + 6)} -3.6Q${n(-f.ex + 6)} 5 ${n(-f.ex)} 5Q${n(-f.ex - 6)} 5 ${n(-f.ex - 6)} -3.6Z`,
          ),
          P(
            `M${n(f.ex - 6)} -3.6L${n(f.ex + 6)} -3.6Q${n(f.ex + 6)} 5 ${n(f.ex)} 5Q${n(f.ex - 6)} 5 ${n(f.ex - 6)} -3.6Z`,
          ),
        ],
        o.alt || "#2D3240",
      ) +
      L(`M${n(-f.ex + 6)} -2.6L${n(f.ex - 6)} -2.6`, 2.2) +
      L(
        `M${n(-f.ex - 3.6)} -1L${n(-f.ex - 1.4)} -1M${n(f.ex - 3.6)} -1L${n(f.ex - 1.4)} -1`,
        1.4,
        WH,
        ' opacity=".8"',
      ),
  },
  glasses: {
    slot: "eyes",
    keepEyes: 1,
    d: (_o, f) =>
      `<circle cx="${n(-f.ex)}" cy="0" r="6.4" fill="${WH}" fill-opacity=".25" stroke="${INK}" stroke-width="2"/><circle cx="${n(f.ex)}" cy="0" r="6.4" fill="${WH}" fill-opacity=".25" stroke="${INK}" stroke-width="2"/>` +
      L(`M${n(-f.ex + 6.4)} -1Q0 -3.4 ${n(f.ex - 6.4)} -1`, 2),
  },
  monocle: {
    slot: "eyes",
    keepEyes: 1,
    d: (_o, f) =>
      `<circle cx="${n(f.ex)}" cy="0" r="6.6" fill="${WH}" fill-opacity=".25" stroke="${GOLD}" stroke-width="2.2"/>` +
      L(`M${n(f.ex + 5)} 4.6Q${n(f.ex + 8)} 14 ${n(f.ex + 3)} 22`, 1.2, GOLD),
  },
  eyepatch: {
    slot: "eyes",
    d: (_o, f) =>
      L(`M${n(-f.ex - 16)} -10L${n(f.ex + 16)} 4`, 1.6) +
      OL([El(f.ex, 0.6, 5.4, 6)], "#2D3240"),
    hideRight: 1,
  },
  domino: {
    slot: "eyes",
    under: 1,
    keepEyes: 1,
    d: (o, f) =>
      OL(
        [
          P(
            `M${n(-f.ex - 10)} -4Q${n(-f.ex)} -9 0 -3Q${n(f.ex)} -9 ${n(f.ex + 10)} -4Q${n(f.ex + 11)} 5 ${n(f.ex)} 6Q3 6 0 3Q-3 6 ${n(-f.ex)} 6Q${n(-f.ex - 11)} 5 ${n(-f.ex - 10)} -4Z`,
          ),
        ],
        o.alt || "#2D3240",
      ),
  },
  disguise: {
    slot: "eyes",
    keepEyes: 1,
    d: (_o, f) =>
      `<circle cx="${n(-f.ex)}" cy="0" r="6" fill="${WH}" fill-opacity=".2" stroke="${INK}" stroke-width="2.4"/><circle cx="${n(f.ex)}" cy="0" r="6" fill="${WH}" fill-opacity=".2" stroke="${INK}" stroke-width="2.4"/>` +
      L(
        `M${n(-f.ex - 6)} -6.6Q${n(-f.ex)} -9.6 ${n(-f.ex + 6)} -6.6M${n(f.ex - 6)} -6.6Q${n(f.ex)} -9.6 ${n(f.ex + 6)} -6.6`,
        2.6,
      ) +
      OL([El(0, 6, 3.4, 4.2)], "#F7C29E") +
      OL(
        [
          P(
            "M0 11C-4 8-10 9-11 13C-7 12-4 14 0 13C4 14 7 12 11 13C10 9 4 8 0 11Z",
          ),
        ],
        "#3E4556",
      ),
  },
  visor: {
    slot: "eyes",
    d: (_o, f) =>
      OL(
        [
          `<rect x="${n(-f.ex - 8)}" y="-5" width="${n(f.ex * 2 + 16)}" height="10" rx="5"`,
        ],
        "#3E4556",
      ) +
      F(
        `<rect x="${n(-f.ex - 5)}" y="-2" width="${n(f.ex * 2 + 10)}" height="4" rx="2"`,
        "#5EE6E0",
      ),
  },
  // face
  mustache: {
    slot: "face",
    d: (o) =>
      OL(
        [
          P(
            "M0 -1C-4 -4.4-10 -3.4-12.6 1C-9 0-5 2 0 1C5 2 9 0 12.6 1C10 -3.4 4 -4.4 0 -1Z",
          ),
        ],
        o.alt || "#6E4B37",
      ),
  },
  beard: {
    slot: "face",
    dy: 2.6,
    d: (o) => {
      const c = o.alt || "#E9ECF1";
      return (
        OL(
          [
            P(
              "M-19-9C-21 3-18 13-13 18C-12 23-7 22-6 26C-4 31 0 28 0 33C0 28 4 31 6 26C7 22 12 23 13 18C18 13 21 3 19-9C16-3 11 1 6 2C3 0-3 0-6 2C-11 1-16-3-19-9Z",
            ),
          ],
          c,
        ) +
        L(
          "M-13 5Q-12 11-9 15M-5 7Q-5 14-3 20M5 7Q5 14 3 20M13 5Q12 11 9 15",
          1.3,
          E.tone(c, -0.16),
        ) +
        OL(
          [
            P(
              "M0-2C-3-5.4-9.4-5.4-12-0.6C-8-2-4.6 0 0 0C4.6 0 8-2 12-0.6C9.4-5.4 3-5.4 0-2Z",
            ),
          ],
          c,
        )
      );
    },
  },
  goatee: {
    slot: "face",
    dy: 3.6,
    d: (o) => OL([P("M-4-1Q-4 8 0 13Q4 8 4-1Z")], o.alt || "#F3EAD6"),
  },
  oldbrows: {
    slot: "brows",
    d: (_o, f) =>
      OL(
        [
          P(
            `M${n(-f.ex - 6)} -6.6C${n(-f.ex - 5)} -11 ${n(-f.ex + 4)} -11.4 ${n(-f.ex + 6)} -7.6C${n(-f.ex + 2)} -8.4 ${n(-f.ex - 2)} -7.4 ${n(-f.ex - 6)} -6.6Z`,
          ),
          P(
            `M${n(f.ex + 6)} -6.6C${n(f.ex + 5)} -11 ${n(f.ex - 4)} -11.4 ${n(f.ex - 6)} -7.6C${n(f.ex - 2)} -8.4 ${n(f.ex + 2)} -7.4 ${n(f.ex + 6)} -6.6Z`,
          ),
        ],
        "#E9ECF1",
      ),
  },
  // neck
  bowtie: {
    slot: "neck",
    d: (o) =>
      OL(
        [P("M0 0L-9-5Q-10.6 0-9 5Z"), P("M0 0L9-5Q10.6 0 9 5Z")],
        o.alt || "#E8574D",
      ) + OL([Ci(0, 0, 2.4)], E.tone(o.alt || "#E8574D", -0.15)),
  },
  tie: {
    slot: "neck",
    d: () =>
      OL([P("M-3-2L3-2L4 2L6 22L0 28L-6 22L-4 2Z")], "#4F86E0") +
      L("M-4 8L4 4M-5 15L5 11", 1.6, "#34476E"),
  },
  scarf: {
    slot: "neck",
    d: (o) =>
      OL(
        [
          `<rect x="-26" y="-4" width="52" height="9" rx="4.5"`,
          P("M10 2L20 2L22 20L12 22Z"),
        ],
        o.alt || "#E8574D",
      ) +
      L(
        "M-16-4L-16 5M-6-4L-6 5M4-4L4 5M13 8L21 7M13 14L21 13",
        2,
        E.mixc(o.alt || "#E8574D", WH, 0.55),
      ),
  },
  medal: {
    slot: "neck",
    d: () =>
      OL([P("M-7-4L0 8L7-4L3-4L0 3L-3-4Z")], "#4F86E0") +
      OL([Ci(0, 11, 5.4)], GOLD) +
      F(P(star(0, 11, 3)), "#E9B530"),
  },
  badge: { slot: "neck", d: () => OL([P(star(10, 8, 6, 5, 0.5))], GOLD) },
  collar: {
    slot: "neck",
    d: () =>
      OL([P("M-28 -4L-6 6L-18 -14Z"), P("M28 -4L6 6L18 -14Z")], "#2D3240") +
      F(P("M-24 -4.6L-9 3.4L-17 -10Z"), "#C93A45") +
      F(P("M24 -4.6L9 3.4L17 -10Z"), "#C93A45"),
  },
  // side
  flower: {
    slot: "side",
    pin: "left",
    c: [-22, 4],
    d: () =>
      G(
        "translate(-22 4)",
        OL(
          [
            Ci(-3.4, -3, 3.8),
            Ci(3.4, -3, 3.8),
            Ci(-4, 3, 3.8),
            Ci(4, 3, 3.8),
            Ci(0, 5.6, 3.8),
          ],
          "#F38FAA",
        ) + F(Ci(0, 1, 2.6), "#F8D35B"),
      ),
  },
  bandaid: {
    slot: "side",
    pin: "cheek",
    c: [14, 18],
    d: () =>
      G(
        "translate(14 18) rotate(-30)",
        OL(
          [`<rect x="-6" y="-2.4" width="12" height="4.8" rx="2.4"`],
          "#F7C29E",
        ) +
          F(
            `<rect x="-1.8" y="-1.6" width="3.6" height="3.2" rx=".8"`,
            "#E9A97E",
          ),
      ),
  },
};

// ---------- effects around the character ----------
export function fx(kind: string, h: Head): string {
  const ty = Math.max(12, h.T - 2);
  switch (kind) {
    case "zzz":
      return L(
        `M70 ${ty + 8}L75 ${ty + 8}L70 ${ty + 13}L75 ${ty + 13}M77 ${ty}L83 ${ty}L77 ${ty + 6}L83 ${ty + 6}`,
        1.9,
      );
    case "sweat":
      return OL(
        [
          P(
            `M${n(50 - h.hw - 1)} ${h.T + 4}Q${n(50 - h.hw - 5)} ${h.T + 11} ${n(50 - h.hw - 1)} ${h.T + 12}Q${n(50 - h.hw + 3)} ${h.T + 11} ${n(50 - h.hw - 1)} ${h.T + 4}Z`,
          ),
        ],
        "#A8D8F6",
      );
    case "drops":
      return OL(
        [
          P(
            `M20 ${ty + 2}Q16 ${ty + 9} 20 ${ty + 11}Q24 ${ty + 9} 20 ${ty + 2}Z`,
          ),
          P(
            `M80 ${ty - 2}Q76 ${ty + 5} 80 ${ty + 7}Q84 ${ty + 5} 80 ${ty - 2}Z`,
          ),
          P(
            `M86 ${ty + 12}Q83.6 ${ty + 17} 86 ${ty + 18.4}Q88.4 ${ty + 17} 86 ${ty + 12}Z`,
          ),
        ],
        "#7FD0F0",
      );
    case "sparkles":
      return OL(
        [
          P(spark(20, ty + 4, 4.6)),
          P(spark(82, ty + 16, 3.6)),
          P(spark(76, ty - 2, 2.4)),
        ],
        "#F6E27A",
      );
    case "stars":
      return OL(
        [
          P(star(19, ty + 8, 4)),
          P(star(81, ty + 2, 3.2)),
          P(star(85, ty + 20, 2.2)),
        ],
        "#F6E27A",
      );
    case "bolt":
      return OL(
        [
          P(
            `M80 ${ty - 2}L72 ${ty + 10}L78 ${ty + 10}L74 ${ty + 20}L84 ${ty + 6}L78 ${ty + 6}Z`,
          ),
        ],
        "#F8D35B",
      );
    case "snow":
      return [
        [20, ty + 6, 4],
        [80, ty + 2, 3.4],
        [84, ty + 18, 2.6],
      ]
        .map(([x, y, r]) =>
          L(
            `M${x - r} ${y}L${x + r} ${y}M${n(x - r / 2)} ${n(y - r * 0.87)}L${n(x + r / 2)} ${n(y + r * 0.87)}M${n(x - r / 2)} ${n(y + r * 0.87)}L${n(x + r / 2)} ${n(y - r * 0.87)}`,
            1.6,
            "#4F86E0",
          ),
        )
        .join("");
    case "rain":
    case "storm":
      return (
        OL(
          [
            Ci(72, ty, 5),
            Ci(79, ty - 3, 6),
            Ci(85, ty + 1, 4.6),
            `<rect x="70" y="${ty - 1}" width="17" height="6" rx="3"`,
          ],
          "#D7DDE8",
        ) +
        (kind === "storm"
          ? OL(
              [
                P(
                  `M80 ${ty + 6}L76 ${ty + 13}L80 ${ty + 13}L77 ${ty + 19}L84 ${ty + 10}L80 ${ty + 10}Z`,
                ),
              ],
              "#F8D35B",
            )
          : L(
              `M74 ${ty + 9}L73 ${ty + 13}M80 ${ty + 9}L79 ${ty + 13}M86 ${ty + 9}L85 ${ty + 13}`,
              1.8,
              "#4F86E0",
            ))
      );
    case "sun":
      return (
        OL([Ci(80, ty + 2, 6)], "#F8D35B") +
        L(
          `M80 ${ty - 7}L80 ${ty - 10}M89 ${ty + 2}L92 ${ty + 2}M71 ${ty + 2}L68 ${ty + 2}M86.4 ${ty - 4.4}L88.4 ${ty - 6.4}M73.6 ${ty - 4.4}L71.6 ${ty - 6.4}M86.4 ${ty + 8.4}L88.4 ${ty + 10.4}`,
          1.8,
          "#E9B530",
        )
      );
    case "moon":
      return OL(
        [P(`M82 ${ty - 6}A9 9 0 1 0 86 ${ty + 10}A7 7 0 1 1 82 ${ty - 6}Z`)],
        "#F6E27A",
      );
    case "notes":
      return (
        OL([El(76, ty + 12, 3, 2.4, -20), El(85, ty + 8, 3, 2.4, -20)], INK) +
        L(`M78.6 ${ty + 11}L78.6 ${ty}L87.6 ${ty - 3}L87.6 ${ty + 7}`, 1.8)
      );
    case "bubbles":
      return [
        [20, ty + 10, 3.4],
        [16, ty + 2, 2.2],
        [82, ty + 4, 4],
        [86, ty + 14, 2.4],
      ]
        .map(
          ([x, y, r]) =>
            `<circle cx="${x}" cy="${y}" r="${r}" fill="#EAF5FB" stroke="${INK}" stroke-width="1.6"/>`,
        )
        .join("");
    case "steam":
      return L(
        `M40 ${ty - 2}Q37 ${ty - 6} 40 ${ty - 10}Q43 ${ty - 14} 40 ${ty - 18}M50 ${ty - 4}Q47 ${ty - 8} 50 ${ty - 12}Q53 ${ty - 16} 50 ${ty - 20}M60 ${ty - 2}Q57 ${ty - 6} 60 ${ty - 10}Q63 ${ty - 14} 60 ${ty - 18}`,
        1.8,
        "#9AA3B2",
      );
    case "hearts":
      return OL([P(heart(20, ty + 6, 1)), P(heart(82, ty, 0.8))], "#F38FAA");
    case "question":
      return (
        OLL(
          `M75 ${ty + 2}Q75 ${ty - 4} 80 ${ty - 4}Q85 ${ty - 4} 85 ${ty + 1}Q85 ${ty + 4} 80 ${ty + 6}L80 ${ty + 9}`,
          2.6,
          "#4F86E0",
        ) + OL([Ci(80, ty + 14, 1.8)], "#4F86E0")
      );
    case "exclaim":
      return (
        OLL(`M81 ${ty - 4}L80 ${ty + 8}`, 3, "#E8574D") +
        OL([Ci(80, ty + 13, 1.9)], "#E8574D")
      );
    case "leaf":
      return OL(
        [
          P(
            `M18 ${ty + 10}C18 ${ty + 2} 24 ${ty - 2} 30 ${ty - 2}C30 ${ty + 6} 24 ${ty + 10} 18 ${ty + 10}Z`,
          ),
        ],
        "#6CC487",
      );
    case "clover":
      return OL(
        [
          Ci(80, ty, 3.4),
          Ci(84, ty + 4, 3.4),
          Ci(76, ty + 4, 3.4),
          Ci(80, ty + 8, 3.4),
        ],
        "#6CC487",
      );
    case "speed":
      return L(
        `M8 ${h.cy - 4}L18 ${h.cy - 4}M5 ${h.cy + 4}L17 ${h.cy + 4}M9 ${h.cy + 12}L18 ${h.cy + 12}`,
        2.2,
        "#9AA3B2",
      );
    case "atom":
      return G(
        `translate(80 ${ty + 4})`,
        `<g fill="none" stroke="${INK}" stroke-width="1.4"><ellipse rx="8" ry="3"/><ellipse rx="8" ry="3" transform="rotate(60)"/><ellipse rx="8" ry="3" transform="rotate(-60)"/></g>` +
          F(Ci(0, 0, 1.8), "#E8574D"),
      );
    case "rainbow":
      return ["#E8574D", "#F39A4C", "#F8D35B", "#6CC487", "#72B4F2", "#8F70DB"]
        .map(
          (c, i) =>
            `<path d="M${2 + i * 3.4} ${h.cy + 6}A${48 - i * 3.4} ${44 - i * 3.4} 0 0 1 ${98 - i * 3.4} ${h.cy + 6}" fill="none" stroke="${c}" stroke-width="3.4"/>`,
        )
        .join("");
    case "glow":
      return `<ellipse cx="50" cy="${h.cy + 4}" rx="${h.hw + 14}" ry="${h.r + 14}" fill="#FFF6C8" opacity=".75"/><ellipse cx="50" cy="${h.cy + 4}" rx="${h.hw + 8}" ry="${h.r + 8}" fill="#FFF6C8"/>`;
    case "rays":
      return G(
        `translate(50 ${h.cy})`,
        Array.from(
          { length: 12 },
          (_, i) =>
            `<path d="M0 0L${n(60 * Math.cos((i * 30 * Math.PI) / 180 - 0.12))} ${n(60 * Math.sin((i * 30 * Math.PI) / 180 - 0.12))}L${n(60 * Math.cos((i * 30 * Math.PI) / 180 + 0.12))} ${n(60 * Math.sin((i * 30 * Math.PI) / 180 + 0.12))}Z" fill="#FFF3B8"/>`,
        ).join(""),
      );
    case "comettail":
    case "meteortail": {
      const c = [50, h.cy];
      const R = h.r;
      const tip = [4, 8];
      const dx = tip[0] - c[0];
      const dy = tip[1] - c[1];
      const len = Math.hypot(dx, dy);
      const d = [dx / len, dy / len];
      const pp = [-d[1], d[0]];
      const fire = kind === "meteortail";
      const cols = fire
        ? ["#E8574D", "#F59A3C", "#F8D35B"]
        : ["#F59A3C", "#F8D35B", "#FFF3C4"];
      let out = "";
      [1, 0.68, 0.38].forEach((w, i) => {
        const a = [c[0] + pp[0] * R * 0.96 * w, c[1] + pp[1] * R * 0.96 * w];
        const b = [c[0] - pp[0] * R * 0.96 * w, c[1] - pp[1] * R * 0.96 * w];
        const t = [
          tip[0] + d[0] * -len * 0.22 * i,
          tip[1] + d[1] * -len * 0.22 * i,
        ];
        let path: string;
        if (fire) {
          const pts = [];
          for (let j = 0; j <= 5; j++) {
            const u = j / 5;
            const ax = a[0] + (t[0] - a[0]) * u;
            const ay = a[1] + (t[1] - a[1]) * u;
            const off = (j % 2 ? 5 : 0) * (1 - u) * w;
            pts.push(`${n(ax + pp[0] * off)} ${n(ay + pp[1] * off)}`);
          }
          const pts2 = [];
          for (let j = 5; j >= 0; j--) {
            const u = j / 5;
            const bx = b[0] + (t[0] - b[0]) * u;
            const by = b[1] + (t[1] - b[1]) * u;
            const off = (j % 2 ? 5 : 0) * (1 - u) * w;
            pts2.push(`${n(bx - pp[0] * off)} ${n(by - pp[1] * off)}`);
          }
          path = `M${pts.join("L")}L${pts2.join("L")}Z`;
        } else {
          const m1 = [
            (a[0] + t[0]) / 2 + pp[0] * 5 * w,
            (a[1] + t[1]) / 2 + pp[1] * 5 * w,
          ];
          const m2 = [
            (b[0] + t[0]) / 2 - pp[0] * 5 * w,
            (b[1] + t[1]) / 2 - pp[1] * 5 * w,
          ];
          path = `M${n(a[0])} ${n(a[1])}Q${n(m1[0])} ${n(m1[1])} ${n(t[0])} ${n(t[1])}Q${n(m2[0])} ${n(m2[1])} ${n(b[0])} ${n(b[1])}Z`;
        }
        out += OL([P(path)], cols[i]);
      });
      if (!fire)
        out += OL(
          [P(spark(16, 44, 3.4)), P(spark(40, 14, 2.6)), P(spark(26, 30, 2))],
          WH,
        );
      return out;
    }
    case "tail":
      return OL(
        [
          P(`M30 ${h.cy - 8}L4 ${h.cy - 30}L36 ${h.cy - 20}Z`),
          P(`M28 ${h.cy}L2 ${h.cy - 12}L32 ${h.cy - 6}Z`),
        ],
        "#FFE9A8",
      );
    case "flametail":
      return (
        OL(
          [
            P(
              `M28 ${h.cy - 12}Q12 ${h.cy - 28} 4 ${h.cy - 40}Q22 ${h.cy - 30} 36 ${h.cy - 22}Z`,
            ),
          ],
          "#F59A3C",
        ) +
        F(
          P(
            `M30 ${h.cy - 14}Q18 ${h.cy - 24} 12 ${h.cy - 32}Q24 ${h.cy - 26} 34 ${h.cy - 20}Z`,
          ),
          "#F8D35B",
        )
      );
    case "string":
      return L(
        `M50 ${h.cy + h.r}Q46 ${h.cy + h.r + 6} 52 ${h.cy + h.r + 12}Q56 ${h.cy + h.r + 16} 50 100`,
        1.6,
      );
    case "tadtail":
      return OLL(
        `M${50 + h.hw - 4} ${h.cy + 16}Q${50 + h.hw + 10} ${h.cy + 26} ${50 + h.hw + 6} ${h.cy + 36}`,
        6,
        "#3E4556",
      );
    default:
      return "";
  }
}

/** Eyes on stalks (snail, crab): a ball each, and the expression inside it. */
export function stalkEyes(
  kind: string,
  pts: Pt[],
  pal: Pal,
  lod: number,
): string {
  let s = "";
  pts.forEach(([x, y], i) => {
    let e = kind;
    if (kind === "wink") e = i ? "happy" : "dot";
    if (kind === "odd") e = i ? "dot" : "wide";
    if (kind === "mono" || kind === "spider" || kind === "none" || !kind)
      e = "dot";
    const side = i ? 1 : -1;
    if (CLOSED.has(e)) {
      s +=
        OL([Ci(x, y, 6.4)], pal.b) +
        eye(e, x, y + (e === "sleepy" ? 0.4 : 1), side, lod, false);
    } else if (e === "half") {
      s +=
        OL([Ci(x, y, 6.4)], WH) +
        F(
          P(`M${n(x - 6.4)} ${n(y)}A6.4 6.4 0 0 1 ${n(x + 6.4)} ${n(y)}Z`),
          pal.b,
        ) +
        F(
          P(
            `M${n(x - 3.4)} ${n(y + 0.4)}A3.4 3.4 0 0 0 ${n(x + 3.4)} ${n(y + 0.4)}Z`,
          ),
          INK,
        ) +
        L(`M${n(x - 6.4)} ${n(y)}L${n(x + 6.4)} ${n(y)}`, 1.8);
    } else if (e === "dot") {
      s +=
        OL([Ci(x, y, 6.4)], WH) +
        F(Ci(x + 0.6, y + 0.6, 3), INK) +
        (lod > 0 ? F(Ci(x - 0.4, y - 0.6, 1), WH) : "");
    } else {
      s +=
        OL([Ci(x, y, 6.4)], WH) +
        G(
          `translate(${x} ${y}) scale(.82) translate(${-x} ${-y})`,
          eye(e, x, y, side, lod, false),
        );
    }
  });
  return s;
}
