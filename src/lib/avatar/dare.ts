import {
  top as artTop,
  C,
  Ci,
  type Draws,
  ears,
  F,
  type Head,
  INK,
  L,
  OL,
  OLL,
  P,
  type Pal,
  type Reach,
  WH,
} from "./art";
import type { Rng } from "./engine";
import * as E from "./engine";

// The Dare: the neutral creature for names without a species, and its clothes.

const SHIRTS = [
  "sky",
  "coral",
  "mint",
  "yellow",
  "lilac",
  "teal",
  "rose",
  "blue",
  "lime",
  "orange",
  "purple",
  "aqua",
  "white",
  "charcoal",
];
const BODIES: [string, number][] = [
  ["gum", 3],
  ["bean", 1.2],
  ["pear", 1.2],
  ["wide", 0.8],
];
const TOPS: [string, number][] = [
  ["curl", 3.4],
  ["nubs", 1.4],
  ["none", 1],
  ["sprout", 0.7],
  ["twin", 0.8],
];

/** The signature curl: a little hook like the top of a "?", for だれ, "who?". */
export function topper(kind: string, h: Head, pal: Pal, r: Draws): Reach {
  const t = h.T;
  switch (kind) {
    case "curl":
      return {
        back: OLL(
          `M50 ${t + 4}C50 ${t - 4} 50.6 ${t - 8} 54.6 ${t - 11}C58.6 ${t - 14} 57.6 ${t - 20} 52.6 ${t - 20}C48.6 ${t - 20} 47 ${t - 17} 47.6 ${t - 14.6}`,
          3.4,
          pal.s,
        ),
        top: t - 22,
      };
    case "twin":
      return {
        back:
          OLL(
            `M45 ${t + 4}C44 ${t - 4} 40 ${t - 8} 37 ${t - 10}M55 ${t + 4}C56 ${t - 4} 60 ${t - 8} 63 ${t - 10}`,
            3,
            pal.s,
          ) + OL([Ci(36.4, t - 10.6, 3.2), Ci(63.6, t - 10.6, 3.2)], pal.s),
        top: t - 14,
      };
    case "nubs": {
      const e = ears("small", h, pal);
      return { back: e.back, top: e.top };
    }
    case "sprout":
      return artTop("sprout", h, pal, r);
    default:
      return { back: "", top: 99 };
  }
}

/** The shirt: everything below a round neckline at y 80. */
export const SHIRT = "M-10 79H40Q50 90 60 79H110V130H-10Z";

/** Clothes, drawn over the shirt. Collar at (50, 80). */
export function outfit(kind: string, shirt: string): string {
  const s = E.tone(shirt, -0.12);
  const tee = L("M40 79.4Q50 91 60 79.4", 2, s);
  switch (kind) {
    case "stripes":
      return (
        F('<rect x="0" y="88" width="100" height="5"', WH) +
        F('<rect x="0" y="99" width="100" height="5"', WH) +
        F('<rect x="0" y="110" width="100" height="5"', WH) +
        tee
      );
    case "labcoat":
      return (
        F(P("M41 79L50 97L59 79Z"), "#72B4F2") +
        L("M41 79L50 97L59 79M50 97L50 114", 1.8, "#C9CFD9") +
        F(Ci(56, 104, 1.4), "#9AA3B2")
      );
    case "suit":
      return (
        F(P("M40 79L50 98L60 79Z"), WH) +
        OL([P("M48.4 84L51.6 84L52.6 96L50 99L47.4 96Z")], "#E8574D") +
        L("M40 79L50 98L60 79", 1.6, E.tone(shirt, -0.2))
      );
    case "uniform":
      return (
        L("M41 79L50 92L59 79M50 92L50 114", 1.8, s) +
        F(Ci(50, 98, 1.5), "#F2C14E") +
        F(Ci(50, 106, 1.5), "#F2C14E") +
        F('<rect x="27" y="90" width="9" height="3" rx="1.5"', "#F2C14E") +
        F('<rect x="64" y="90" width="9" height="3" rx="1.5"', "#F2C14E")
      );
    case "armor":
      return (
        L("M20 96Q50 86 80 96M18 106Q50 96 82 106", 2, s) +
        F(Ci(30, 93, 1.4), s) +
        F(Ci(70, 93, 1.4), s) +
        tee
      );
    case "vest":
      return (
        F('<rect x="0" y="95" width="100" height="5"', "#F6E27A") +
        F('<rect x="0" y="103" width="100" height="3"', "#E3E7EE") +
        L("M41 79L50 92L59 79", 1.8, s)
      );
    case "apron":
      return (
        F(P("M35 90L65 90L67 114L33 114Z"), WH) +
        L("M37 90L42 80M63 90L58 80", 2, WH)
      );
    case "robe":
      return (
        F(P("M40 79L50 100L60 79L63 79L50 106L37 79Z"), "#F2C14E") +
        F(Ci(50, 108, 2), "#F2C14E")
      );
    case "redrobe":
      return (
        F(P("M35 79L50 104L65 79L68 79L50 110L32 79Z"), WH) +
        F(Ci(42, 95, 1), INK) +
        F(Ci(58, 95, 1), INK)
      );
    case "hoodie":
      return (
        L("M40 81Q50 92 60 81", 2.4, s) +
        L("M46 87L45 100M54 87L55 100", 1.4, WH) +
        F('<rect x="38" y="102" width="24" height="9" rx="3"', s)
      );
    case "fur":
      return (
        F(
          P(
            "M10 90Q20 82 30 86Q40 80 50 84Q60 80 70 86Q80 82 90 90L90 97L10 97Z",
          ),
          "#8C6A4A",
        ) +
        L(
          "M22 92L24 95M36 90L38 94M50 89L50 93M64 90L62 94M78 92L76 95",
          1.2,
          "#6E4B37",
        )
      );
    case "sailor":
      return (
        F(
          P("M22 80L40 79L50 96L60 79L78 80L82 96L60 98L50 104L40 98L18 96Z"),
          "#34476E",
        ) +
        L("M24 84L39 95M76 84L61 95", 1.6, WH) +
        OL([P("M45 96L55 96L52 104L48 104Z")], "#E8574D")
      );
    case "hawaii":
      return (
        `<g fill="#F8D35B">${[
          [30, 92],
          [64, 93],
          [44, 106],
          [74, 106],
        ]
          .map(
            ([x, y]) =>
              `<circle cx="${x - 2}" cy="${y}" r="2.3"/><circle cx="${x + 2}" cy="${y}" r="2.3"/><circle cx="${x}" cy="${y - 2.4}" r="2.3"/><circle cx="${x}" cy="${y + 2.2}" r="2.3"/>`,
          )
          .join("")}</g>` +
        [
          [30, 92],
          [64, 93],
          [44, 106],
          [74, 106],
        ]
          .map(([x, y]) => F(Ci(x, y, 1.2), "#E8574D"))
          .join("") +
        L("M41 79L50 92L59 79", 1.8, s)
      );
    case "coat":
      return (
        F(P("M40 79L50 92L60 79Z"), WH) +
        L("M40 79L45 98L50 114M60 79L55 98", 2, s) +
        F(Ci(56, 104, 1.6), s)
      );
    case "kimono":
      return (
        F(P("M38 79L58 106L62 106L44 79Z"), WH) +
        L("M38 79L58 106M62 79L48 92", 2, s) +
        F('<rect x="0" y="104" width="100" height="6"', "#34476E")
      );
    case "space":
      return (
        F('<rect x="29" y="92" width="10" height="7" rx="1.6"', "#4F86E0") +
        F('<rect x="61" y="94" width="9" height="9" rx="4.5"', "#E8574D") +
        L("M26 86Q50 79 74 86", 3, "#AFB6C3")
      );
    case "toga":
      return L("M32 81Q50 100 74 112M38 81Q52 96 68 114", 1.8, s);
    case "turtleneck":
      return (
        F('<rect x="37" y="76" width="26" height="10" rx="4"', shirt) +
        L("M38 79.6L62 79.6M38 82.6L62 82.6", 1, s)
      );
    case "torn":
      return tee + L("M28 100L32 104L30 108M68 98L72 102L69 106", 1.6, s);
    case "onesie":
      return F(Ci(44, 100, 1.6), WH) + F(Ci(56, 100, 1.6), WH) + tee;
    default:
      return tee;
  }
}

/** Body shape, topper, belly and shirt colour for a Dare, all from its own draws. */
export function pick(r: Rng, p: Record<string, string>, bodyName: string) {
  const body = p.dshape || r.pick("dshape", BODIES);
  const top = p.dtop || r.pick("dtop", TOPS);
  const belly = p.belly ? p.belly === "1" : r.chance("belly", 0.3);
  const shirtName =
    p.shirt ||
    r.pick(
      "shirt",
      SHIRTS.filter((c) => c !== bodyName),
    );
  return { body, top, belly, shirt: C[shirtName] || shirtName };
}
