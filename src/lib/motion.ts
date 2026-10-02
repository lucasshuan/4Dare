// Motion tokens from the design system, for the `motion` library.
// Rule of thumb: things entering rise 12px and fade in; things leaving only fade. Nothing bounces.

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

/** Parent for staggered children (answer chips, lists): 40ms apart. */
export const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
} as const;

/** Shared-element moves (the character card travelling between screens). */
export const layoutSpring = { duration: dur.slow, ease: ease.soft } as const;
