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

/** The launch slows into the hang at the top; the fall eases in and out; the drift and spin ease out. */
const EASE_LAUNCH = "cubic-bezier(0.33, 1, 0.68, 1)";
const EASE_IN_OUT = "cubic-bezier(0.45, 0, 0.55, 1)";
const EASE_OUT = "cubic-bezier(0.5, 1, 0.89, 1)";

/** Share of each piece's time spent going up, the rest falling. */
const RISE = 0.3;

/** A number in (-1, 1) that looks random but is fixed by n, so the pieces spread evenly. */
const scatter = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;

/**
 * A burst of confetti: rounded slips, one colour after another, shot up from
 * below the bottom edge across the screen, hanging near the top and falling
 * back past the bottom while they drift sideways and spin. "big" (a hit, the
 * podium) throws more of them. Skipped for reduced motion.
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

    const duration = 2600 + (k % 5) * 250;
    // not tied to the colour, so the burst doesn't leave in coloured rows
    const delay = Math.abs(scatter(k + 0.5)) * 220;
    const peak = h * (0.04 + (k % 7) * 0.025);
    const drift = (((k * 37) % 100) / 100 - 0.5) * w * 0.9;
    const spin = 540 + (i % 46) * 20;
    falls.push(
      box.animate(
        [
          { transform: `translateY(${h + 40}px)`, easing: EASE_LAUNCH },
          {
            transform: `translateY(${peak}px)`,
            offset: RISE,
            easing: EASE_IN_OUT,
          },
          { transform: `translateY(${h + 40}px)` },
        ],
        { duration, delay, fill: "both" },
      ).finished,
      slip.animate(
        [
          { transform: "translateX(0px) rotate(0deg)" },
          { transform: `translateX(${drift}px) rotate(${spin}deg)` },
        ],
        { duration, delay, easing: EASE_OUT, fill: "both" },
      ).finished,
    );
  }

  document.body.append(layer);
  Promise.allSettled(falls).then(() => layer.remove());
}
