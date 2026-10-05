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

/** The fall starts already moving and picks up a little speed on the way down. */
const EASE_FALL = "cubic-bezier(0.3, 0.18, 0.6, 0.55)";
/** Each swing of the sway slows at its ends, like paper in the air. */
const EASE_SWING = "cubic-bezier(0.45, 0, 0.55, 1)";

/** A number in (-1, 1) that looks random but is fixed by n, so the pieces spread evenly. */
const scatter = (n: number) => (Math.sin(n * 12.9898) * 43758.5453) % 1;

/**
 * A burst of confetti: rounded slips, one colour after another, falling from
 * above the top edge across the whole screen and past the bottom, swaying and
 * spinning on the way. "big" (a hit, the podium) drops more of them. Skipped
 * for reduced motion.
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
    // the box falls, the swing inside it sways, the slip inside that spins
    const box = document.createElement("span");
    Object.assign(box.style, {
      position: "absolute",
      top: "-20px",
      left: `${50 + scatter(k) * 50}%`,
    });
    const swing = document.createElement("span");
    swing.style.display = "block";
    const slip = document.createElement("span");
    Object.assign(slip.style, {
      display: "block",
      width: "10px",
      height: "14px",
      borderRadius: "3px",
      background: COLORS[k % COLORS.length],
    });
    swing.append(slip);
    box.append(swing);
    layer.append(box);

    const duration = 1700 + (k % 5) * 200;
    // not tied to the colour, so the pieces don't arrive in coloured rows
    const delay = Math.abs(scatter(k + 0.5)) * 400;
    const above = (k % 6) * 20;
    const sway = (18 + (k % 4) * 10) * (k % 2 ? 1 : -1);
    const drift = scatter(k + 0.25) * w * 0.1;
    const spin = (360 + (i % 8) * 90) * (k % 3 ? 1 : -1);
    const x = (px: number) => ({
      transform: `translateX(${px}px)`,
      easing: EASE_SWING,
    });
    falls.push(
      box.animate(
        [
          { transform: `translateY(${-above}px)` },
          { transform: `translateY(${h + 40}px)` },
        ],
        { duration, delay, easing: EASE_FALL, fill: "both" },
      ).finished,
      swing.animate(
        [x(0), x(sway), x(drift - sway * 0.6), x(drift + sway * 0.5), x(drift)],
        { duration, delay, fill: "both" },
      ).finished,
      slip.animate(
        [{ transform: "rotate(0deg)" }, { transform: `rotate(${spin}deg)` }],
        { duration, delay, fill: "both" },
      ).finished,
    );
  }

  document.body.append(layer);
  Promise.allSettled(falls).then(() => layer.remove());
}
