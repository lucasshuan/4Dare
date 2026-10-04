"use client";

/** The design colours as CSS variables, so the pieces follow the light and dark themes. */
const COLORS = [
  "var(--sky)",
  "var(--apricot)",
  "var(--butter)",
  "var(--yes)",
  "var(--no)",
  "var(--seat-4)",
];

/** Quadratic eases: in-out for each leg of the rise and fall, out for the drift and spin. */
const EASE_IN_OUT = "cubic-bezier(0.45, 0, 0.55, 1)";
const EASE_OUT = "cubic-bezier(0.5, 1, 0.89, 1)";

/** A number in (-1, 1) that looks random but is fixed by n, so the pieces spread evenly. */
const scatter = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;

/**
 * A burst of confetti: rounded slips, one colour after another, thrown up from
 * across the screen, hanging at the top and falling past the bottom while they
 * drift sideways and spin. "big" (a hit, the podium) throws more of them.
 * Skipped for reduced motion.
 */
export function fireConfetti(size: "small" | "big" = "small") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = size === "big" ? 80 : 46;
  const { innerWidth: w, innerHeight: h } = window;
  // a new starting point for each burst, so two in a row don't look the same
  const seed = Math.floor(Math.random() * 1000);

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    zIndex: "60",
    overflow: "hidden",
    pointerEvents: "none",
  });

  const falls: Promise<unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const k = i + seed;
    // the outer box rises and falls, the slip inside it drifts and spins
    const box = document.createElement("span");
    Object.assign(box.style, {
      position: "absolute",
      top: "-20px",
      left: `${50 + scatter(k) * 48}%`,
    });
    const slip = document.createElement("span");
    Object.assign(slip.style, {
      display: "block",
      width: "10px",
      height: "14px",
      borderRadius: "3px",
      background: COLORS[k % COLORS.length],
    });
    box.append(slip);
    layer.append(box);

    const duration = 2200 + (k % 5) * 250;
    const peak = h * 0.05 - (k % 7) * 18;
    const drift = (((k * 37) % 100) / 100 - 0.5) * w * 0.9;
    const spin = 540 + (i % 46) * 20;
    falls.push(
      box.animate(
        [
          { transform: `translateY(${h * 0.35}px)`, easing: EASE_IN_OUT },
          { transform: `translateY(${peak}px)`, easing: EASE_IN_OUT },
          { transform: `translateY(${h + 40}px)` },
        ],
        { duration, fill: "forwards" },
      ).finished,
      slip.animate(
        [
          { transform: "translateX(0px) rotate(0deg)" },
          { transform: `translateX(${drift}px) rotate(${spin}deg)` },
        ],
        { duration, easing: EASE_OUT, fill: "forwards" },
      ).finished,
    );
  }

  document.body.append(layer);
  Promise.allSettled(falls).then(() => layer.remove());
}
