// What for?'s scenes: the opening (the rules on the slate, or just its close
// on later rounds), a lot under the hammer, the end of the auction, the
// envelope and the tally. Lengths in ms.

export const LINEUP = {
  /** "Everyone has 10 coins." … "Then defend your team.", on the room's first match. */
  rules: 9000,
  /** The envelope lands big: the mission is in it, what it can be, and a tip. */
  secret: { first: 5800, later: 5200 },
  /** The first lot comes onto the table. */
  entrance: 900,
  /** A lot sold: the winner's tower rises into the photo, which flies to their board. */
  sold: 2400,
  /** A lot nobody wanted: it goes to the leftovers. */
  unsold: 1400,
  /** Every board side by side, with the coins left. */
  wrap: 5200,
  /** "What for?", the envelope drops, the seal pops, the mission rises. */
  envelope: 5600,
  /** The votes fall one by one under the boards. */
  votes: { base: 1400, each: 420, max: 6200 },
  /** The winners' stamp (or the tie's). */
  stamp: 1800,
  /** With a presenter: who sits in the TV chair (or who the draw put there). */
  chair: 3200,
  /** The presenter's verdict: the winning board and why. */
  verdict: 5200,
} as const;

/** Moments inside those beats (ms from the beat's start). */
export const LINEUP_MARKS = {
  /** envelope: the mission goes up to the header. */
  missionTag: 4800,
} as const;

/** How long the votes take to fall. */
export const votesMs = (votes: number) =>
  Math.min(
    LINEUP.votes.max,
    LINEUP.votes.base + LINEUP.votes.each * Math.max(0, votes),
  );
