// Your character ("Rafa picked yours"), the turn order, and into the game. Lengths in ms.

export const CAST = {
  received: { first: 4300, later: 3000 },
  order: { first: 4900, later: 2400 },
  /** The strip, the history button and the turn body come in; the first ask clock at its end. */
  entrance: { first: 500, later: 600 },
} as const;

/** Moments inside those beats (ms from the beat's start). */
export const CAST_MARKS = {
  /** order: the first player is spotlit, the wash turns to their seat. */
  orderSpot: { first: 2500, later: 1400 },
  /** order: the chat's "Order: …" line. */
  orderLine: { first: 2800, later: 1500 },
  /** turn entrance: the history button and give up pop in. */
  historyIn: 300,
  /** After the cast ends: the chat's "Round n · X's turn" line. */
  turnLine: 200,
} as const;
