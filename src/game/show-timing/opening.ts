// The opening (lobby out, the title scene, the cold open, the vote coming in) and the vote's result. Lengths in ms.

import { tunable } from "../tune";

export const OPENING = tunable("opening", {
  /** The lobby leaves (0.45 s) and the header fades in, over the bare canvas the title scene starts from. */
  curtain: 500,
  /**
   * The title scene: the match's number, the players and the game, on the
   * game's own set. Long on the game's first match in the room (or with a
   * newcomer, the rules follow), short when the same group plays it again.
   */
  title: { first: 9000, later: 6000 },
  /** Who am I?'s cold open (how to play), after the long title scene. */
  intro: 7600,
  /** What for?'s "Round N" card, between a match's rounds. */
  round: 1500,
  /** Vote: the line alone (0.2–0.8 s), it rises (1.0–1.7 s), cards dealt; the clock at the end. Host typing: the form lands. */
  entrance: { vote: 1700, theming: 600 },
  /** A tie spins between the tied themes. */
  tieSpin: 2000,
  /** The vote result: losers dim, then leave. */
  settle: { first: 3300, later: 1500 },
});

/** Moments inside those beats (ms from the beat's start). */
export const OPENING_MARKS = tunable("openingMarks", {
  /** settle: the losers dim. */
  settleDim: { first: 1300, later: 400 },
  /** settle: the heading, the footer and the losers leave. */
  settleLeave: { first: 2800, later: 1100 },
});
