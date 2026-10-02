import { Avatar as DiceAvatar, Style } from "@dicebear/core";
import definition from "@dicebear/styles/critters.json";

// DiceBear "Critters" (CC0). Drawn on a transparent background so the avatar's
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

const cache = new Map<string, string>();

/** The creature for `seed` as a data URI, never in a colour close to `background`. */
export function critterUri(seed: string, background: string): string {
  const key = `${seed}|${background}`;
  let uri = cache.get(key);
  if (!uri) {
    const bg = hue(background);
    const body =
      bg === null ? BODY : BODY.filter((c) => !near(hue(c) ?? -999, bg));
    uri = new DiceAvatar(style, {
      seed,
      backgroundColor: [TRANSPARENT],
      bodyColor: body,
    }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}

/** A fresh seed for "another critter" (works on plain http too, unlike crypto.randomUUID). */
export const randomCritterSeed = () => Math.random().toString(36).slice(2, 10);
