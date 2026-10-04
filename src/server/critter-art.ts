import "server-only";
import { Avatar as DiceAvatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/critters.json";

// DiceBear "Critters" (CC0), drawn on the server only: browsers get them from
// /api/critter (see critterUri). On a transparent background so the avatar's
// pastel shows behind the creature, like the rest of the design.
const style = new Style(definition);
const TRANSPARENT = "#ffffff00";
// The style's body colours, minus its near-white one, which vanishes on light pastels.
const BODY = [
  "#7dd3fc",
  "#a5b4fc",
  "#c4b5fd",
  "#f0abfc",
  "#fda4af",
  "#fca5a5",
  "#fdba74",
  "#fcd34d",
  "#bef264",
  "#6ee7b9",
  "#5eead4",
];

/** Hue in degrees, or null for greys (any body colour shows on those). */
function hue(hex: string): number | null {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (Number.isNaN(d) || d < 0.08) return null;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const near = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d) < 35;
};

/** The creature for `seed` as SVG, never in a colour close to `background` ("#RRGGBB"). */
export function critterSvg(seed: string, background: string): string {
  const bg = hue(background);
  const body =
    bg === null ? BODY : BODY.filter((c) => !near(hue(c) ?? -999, bg));
  return new DiceAvatar(style, {
    seed,
    backgroundColor: [TRANSPARENT],
    bodyColor: body,
  }).toString();
}

/** The same creature as a data URI, for the share images (satori fetches nothing). */
export const critterDataUri = (seed: string, background: string) =>
  `data:image/svg+xml;base64,${Buffer.from(critterSvg(seed, background)).toString("base64")}`;
