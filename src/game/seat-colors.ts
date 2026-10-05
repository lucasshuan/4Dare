// The four seat colours (--seat-1..4 in globals.css). A player gets one on
// joining and keeps it until they leave the room: the free one closest to their
// avatar's colour, so the room's colour is theirs as much as it can be.

/** Hues (deg) of --seat-1..4 in the light theme: blue, apricot, teal, violet. */
const SEAT_HUES = [216, 27, 177, 270] as const;

export const SEAT_COLORS = SEAT_HUES.length;

/** Hue (deg) of a "#rrggbb" colour, or null when it is too grey to have one. */
function hueOf(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = Number.parseInt(m[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (sat < 0.15) return null;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const hueGap = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

/**
 * The colour for someone joining: among the ones nobody holds, the closest to
 * their avatar's colour (the first free one for a grey avatar). With all four
 * held, the first one.
 */
export function pickColorSlot(
  taken: Iterable<number>,
  avatarColor: string,
): number {
  const held = new Set(taken);
  const free = SEAT_HUES.map((_, i) => i).filter((i) => !held.has(i));
  if (free.length === 0) return 0;
  const hue = hueOf(avatarColor);
  if (hue === null) return free[0];
  return free.reduce((best, i) =>
    hueGap(SEAT_HUES[i], hue) < hueGap(SEAT_HUES[best], hue) ? i : best,
  );
}
