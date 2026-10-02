// Guests get a random soft colour behind their avatar.

/** A soft pastel: random hue, fixed saturation and lightness. */
export function randomPastel(): string {
  const h = Math.floor(Math.random() * 360) / 360;
  const s = 0.55;
  const l = 0.86;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}
