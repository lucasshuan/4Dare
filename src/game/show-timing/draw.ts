// The draw (avatars hop into the 4, out comes the slip) and "for whom". Lengths in ms.

export const DRAW = {
  draw: { first: 5800, later: 3400 },
  target: { first: 4600, later: 2600 },
  /**
   * Two players pick for each other: no draw. "For whom" gets this much more,
   * at its start, for its header to come in on its own (no slip lands it).
   */
  lead: 700,
} as const;

/** Moments inside the draw beat (ms from its start). */
export const DRAW_MARKS = {
  /** The wash turns to your target's seat colour. */
  targetWash: { first: 5400, later: 3000 },
} as const;
