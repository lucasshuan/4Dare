// The opening (lobby out, cold open or "Round N", the vote coming in) and the vote's result. Lengths in ms.

export const OPENING = {
  /** The lobby leaves (0.45 s), the brand wash comes in, the header fades in. */
  curtain: 800,
  /** The cold open, on the room's first match only. */
  intro: 7600,
  /** The "Round N" card, on later matches. */
  round: 1500,
  /** Vote: the line alone (0.2–0.8 s), it rises (1.0–1.7 s), cards dealt; the clock at the end. Host typing: the form lands. */
  entrance: { vote: 1700, theming: 600 },
  /** A tie spins between the tied themes. */
  tieSpin: 2000,
  /** The vote result: losers dim, then leave. */
  settle: { first: 3300, later: 1500 },
} as const;

/** Moments inside those beats (ms from the beat's start). */
export const OPENING_MARKS = {
  /** curtain: the brand wash comes in. */
  curtainWash: 100,
  /** settle: the losers dim. */
  settleDim: { first: 1300, later: 400 },
  /** settle: the heading, the footer and the losers leave. */
  settleLeave: { first: 2800, later: 1100 },
} as const;
