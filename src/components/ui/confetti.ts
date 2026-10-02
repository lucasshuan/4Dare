"use client";

import confetti from "canvas-confetti";

/** Reads the design colours from the CSS tokens, so confetti matches light and dark themes. */
function palette(): string[] {
  const css = getComputedStyle(document.documentElement);
  return ["--yes", "--sky", "--apricot", "--butter", "--yes-soft", "--sky-soft"]
    .map((v) => css.getPropertyValue(v).trim())
    .filter(Boolean);
}

/** A few seconds of confetti: two side cannons and a burst from the top. Skipped for reduced motion. */
export function fireConfetti(durationMs = 2600) {
  if (typeof window === "undefined") return;
  const colors = palette();
  const base = {
    colors,
    disableForReducedMotion: true,
    zIndex: 60,
    ticks: 220,
  } as const;
  confetti({
    ...base,
    particleCount: 90,
    spread: 100,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.25 },
  });
  const end = Date.now() + durationMs;
  const tick = () => {
    confetti({
      ...base,
      particleCount: 4,
      angle: 60,
      spread: 55,
      startVelocity: 55,
      origin: { x: 0, y: 0.7 },
    });
    confetti({
      ...base,
      particleCount: 4,
      angle: 120,
      spread: 55,
      startVelocity: 55,
      origin: { x: 1, y: 0.7 },
    });
    if (Date.now() < end) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
