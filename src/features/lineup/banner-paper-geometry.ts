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
 * A diagonal crease with a front that stays in place and a reflected reverse.
 * This uses the two-face principle of B. Sehovac's sticker 5, independently
 * computed for responsive artwork and translated mission text:
 * https://codepen.io/bsehovac/pen/gvejKK
 */
export function paperPeel(progress: number, width: number, height: number) {
  const nx = NX;
  const ny = NY;
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];
  const low = ny * height;
  const high = nx * width;
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
