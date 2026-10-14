type Point = { x: number; y: number };
const ANGLE = (-20 * Math.PI) / 180;
const NX = Math.cos(ANGLE);
const NY = Math.sin(ANGLE);

/** Fixed lighting textures are sized on resize, then moved with the crease. */
export function paperLighting(width: number, height: number) {
  const span = NX * width - NY * height;
  return {
    height: Math.hypot(width, height) * 2,
    frontWidth: span * 0.09,
    reverseWidth: span * 0.12,
  };
}

/** Clips a rectangle to either side of a crease, keeping its vertex order. */
function clip(
  points: Point[],
  nx: number,
  ny: number,
  distance: number,
  side: number,
) {
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const da = (a.x * nx + a.y * ny - distance) * side;
    const db = (b.x * nx + b.y * ny - distance) * side;
    if (da >= 0) result.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

function polygon(points: Point[], width: number, height: number) {
  if (points.length < 3) return "polygon(0% 0%, 0% 0%, 0% 0%)";
  return `polygon(${points.map(({ x, y }) => `${(x / width) * 100}% ${(y / height) * 100}%`).join(", ")})`;
}

/**
 * The crease's way across the sheet: its normal and where it starts and ends.
 * By default it starts at the bottom left corner; `fromTop` turns the normal
 * around, so it starts at the top right corner and runs to the bottom left.
 */
function crease(width: number, height: number, fromTop: boolean) {
  const nx = fromTop ? -NX : NX;
  const ny = fromTop ? -NY : NY;
  return {
    nx,
    ny,
    low: fromTop ? nx * width : ny * height,
    high: fromTop ? ny * height : nx * width,
  };
}

const cornersOf = (width: number, height: number): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

/**
 * A diagonal crease with a front that stays in place and a reflected reverse.
 * This uses the two-face principle of B. Sehovac's sticker 5, independently
 * computed for responsive artwork and translated mission text:
 * https://codepen.io/bsehovac/pen/gvejKK
 */
export function paperPeel(
  progress: number,
  width: number,
  height: number,
  fromTop = false,
) {
  const { nx, ny, low, high } = crease(width, height, fromTop);
  const corners = cornersOf(width, height);
  const at = Math.max(0, Math.min(1, progress));
  const distance = low + (high - low) * at;
  const front = clip(corners, nx, ny, distance, 1);
  const reverse = clip(corners, nx, ny, distance, -1);
  // Reflection across n·point = distance: I - 2nnᵀ, plus 2·distance·n.
  const matrix = [
    1 - 2 * nx * nx,
    -2 * nx * ny,
    -2 * nx * ny,
    1 - 2 * ny * ny,
    2 * distance * nx,
    2 * distance * ny,
  ];
  const diagonal = Math.hypot(width, height);
  const shadeMatrix = (offset: number) =>
    `matrix(${nx},${ny},${-ny},${nx},${nx * offset + ny * diagonal},${ny * offset - nx * diagonal})`;
  return {
    front,
    reverse,
    matrix,
    frontClip: polygon(front, width, height),
    reverseClip: polygon(reverse, width, height),
    reflection: `matrix(${matrix.join(",")})`,
    frontShadeTransform: shadeMatrix(distance),
    reverseShadeTransform: shadeMatrix(distance - (high - low) * 0.12),
  };
}

/**
 * The middle of what shows of a peeling sheet, in its own box: the part still
 * flat plus the flap folded over the crease. A sheet carried while it peels
 * moves by this point, so it doesn't jump as it folds.
 */
export function paperMiddle(
  progress: number,
  width: number,
  height: number,
  fromTop = false,
): Point {
  const { front, reverse, matrix } = paperPeel(
    progress,
    width,
    height,
    fromTop,
  );
  const [a, b, c, d, e, f] = matrix;
  const flap = reverse
    .map(({ x, y }) => ({ x: a * x + c * y + e, y: b * x + d * y + f }))
    .reverse();
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (const shape of [front, flap]) {
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i];
      const q = shape[(i + 1) % shape.length];
      const cross = p.x * q.y - q.x * p.y;
      area += cross;
      cx += (p.x + q.x) * cross;
      cy += (p.y + q.y) * cross;
    }
  }
  return Math.abs(area) < 1e-6
    ? { x: width / 2, y: height / 2 }
    : { x: cx / (3 * area), y: cy / (3 * area) };
}

/**
 * The peel's keyframes, shared by every paper that goes on or comes off a
 * board: times, how far it peels, its throw (x and y in % of its size),
 * scale, turn (deg) and opacity. Peel only advances to completion; the
 * incoming motion traverses it backwards.
 */
export const PAPER_CURVES = {
  times: [0, 0.15, 0.38, 0.55, 0.78, 1],
  peel: [0, 0.13, 0.4, 0.7, 1, 1],
  x: [0, 0.8, 3, 18, 55, 105],
  y: [0, -0.8, -4, -38, -115, -220],
  scale: [1, 1.005, 1.025, 1.12, 1.19, 1.22],
  rotation: [0, 0.3, 1, 6, 17, 28],
  opacity: [1, 1, 1, 1, 0.7, 0],
} as const;

/** A curve of PAPER_CURVES at `progress` (0..1), straight between its keyframes. */
export function samplePaper(values: readonly number[], progress: number) {
  const times = PAPER_CURVES.times;
  const at = Math.max(0, Math.min(1, progress));
  const end = times.findIndex((time) => time >= at);
  if (end <= 0) return values[0];
  const fraction = (at - times[end - 1]) / (times[end] - times[end - 1]);
  return values[end - 1] + (values[end] - values[end - 1]) * fraction;
}
