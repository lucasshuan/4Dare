"use client";

import confetti from "canvas-confetti";

/** Reads the design colours from the CSS tokens, so confetti matches light and dark themes. */
function palette(): string[] {
  const css = getComputedStyle(document.documentElement);
  return ["--yes", "--sky", "--apricot", "--butter", "--yes-soft", "--sky-soft"]
    .map((v) => css.getPropertyValue(v).trim())
    .filter(Boolean);
}

/**
 * A burst of confetti from the top middle of the screen. "big" (a hit, the podium)
 * follows it with a smaller second burst. Skipped for reduced motion.
 */
export function fireConfetti(size: "small" | "big" = "small") {
  if (typeof window === "undefined") return;
  const base = {
    colors: palette(),
    disableForReducedMotion: true,
    zIndex: 60,
    ticks: 200,
    spread: 80,
    startVelocity: 32,
    scalar: 0.9,
    origin: { x: 0.5, y: 0.3 },
  } as const;
  confetti({ ...base, particleCount: size === "big" ? 60 : 30 });
  if (size === "big")
    window.setTimeout(
      () => confetti({ ...base, particleCount: 30, spread: 110 }),
      250,
    );
}
