// The pick table coming in, and the moment everyone has picked (or time ran out). Lengths in ms.

export const PICK = {
  /** The table lands; the pick clock pops at its end. */
  entrance: 400,
  /** The last card grows ("Everyone has picked!"), or the "Time!" stamp. */
  picked: { confirmed: { first: 1400, later: 1000 }, timeout: 1300 },
} as const;
