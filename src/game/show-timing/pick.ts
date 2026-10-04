// The pick table coming in, and the moment everyone has picked (or time ran out). Lengths in ms.

export const PICK = {
  /** The table lands; the pick clock pops at its end. */
  entrance: 400,
  /** The last card grows ("Everyone has picked!"), or the "Time!" stamp. */
  picked: { confirmed: { first: 1400, later: 1000 }, timeout: 1300 },
} as const;

/**
 * The table's entrance, in ms from the start of the pick `entrance` beat
 * (spec B §5.1). It runs past the beat: the clock pops at 400 ms while the
 * hand and the actions are still coming in. Client only, so the beat stays short.
 */
export const PICK_TABLE = {
  title: 0,
  card: 100,
  hand: 600,
  /** Between two hand cards. */
  handStagger: 60,
  actions: 800,
  label: 900,
  /** The table fades out over the end of the cast's `picked` beat. */
  fadeOut: 400,
} as const;
