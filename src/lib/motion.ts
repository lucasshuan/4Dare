// Motion tokens from the design system, for the `motion` library.
// Rule of thumb for screens and panels: things entering rise 12px and fade in;
// things leaving only fade. The match's stage scenes are the exception: they
// squash, hop and overshoot on purpose, with the GSAP eases of the approved
// prototype (`gs` below).

export const dur = { fast: 0.14, base: 0.26, slow: 0.48, reveal: 0.7 } as const;
export const ease = {
  soft: [0.22, 1, 0.36, 1],
  swap: [0.65, 0, 0.35, 1],
} as const;

/** Default enter/exit for screens and panels. */
export const riseIn = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: dur.base, ease: ease.soft },
  },
  exit: { opacity: 0, transition: { duration: dur.fast, ease: ease.soft } },
} as const;

/** Shared-element moves (the character card travelling between screens). */
export const layoutSpring = { duration: dur.slow, ease: ease.soft } as const;

export type EaseFn = (t: number) => number;

// GSAP's powerN eases: power1 is quadratic, power2 cubic, power3 quartic.
const powIn =
  (n: number): EaseFn =>
  (t) =>
    t ** (n + 1);
const powOut =
  (n: number): EaseFn =>
  (t) =>
    1 - (1 - t) ** (n + 1);
const powInOut =
  (n: number): EaseFn =>
  (t) =>
    t < 0.5 ? 2 ** n * t ** (n + 1) : 1 - (-2 * t + 2) ** (n + 1) / 2;

/**
 * GSAP's eases as exact functions, so the stage scenes move the way the
 * prototype did. GSAP's default (no ease named) is `p1Out`. A GSAP `scale`
 * sets both axes: port it as `scaleX` + `scaleY`.
 */
export const gs = {
  p1In: powIn(1),
  p1Out: powOut(1),
  p1InOut: powInOut(1),
  p2In: powIn(2),
  p2Out: powOut(2),
  p2InOut: powInOut(2),
  p3In: powIn(3),
  p3Out: powOut(3),
  p3InOut: powInOut(3),
  sineInOut: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as EaseFn,
  /** `back.out(s)`: overshoots by `s` (GSAP's default 1.70158) and settles. */
  backOut:
    (s = 1.70158): EaseFn =>
    (t) => {
      const q = t - 1;
      return q * q * ((s + 1) * q + s) + 1;
    },
  bounceOut: ((t) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t - 1.5 / d) ** 2 + 0.75;
    if (t < 2.5 / d) return n * (t - 2.25 / d) ** 2 + 0.9375;
    return n * (t - 2.625 / d) ** 2 + 0.984375;
  }) as EaseFn,
};

/**
 * The way back of a GSAP yoyo: the same curve played backwards in time.
 * A yoyo is keyframes `[a, b, a]` with `ease: [e, mirror(e)]`.
 */
export const mirror =
  (e: EaseFn): EaseFn =>
  (t) =>
    1 - e(1 - t);
