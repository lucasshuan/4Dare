// The Impostor's deal: after the theme, everyone's card comes in ("Memorize
// it. Don't show it." then "One of you has another. It may be you."), then
// goes up beside the theme as the first question comes in.

export const DEAL = {
  /** The card in the middle, both sentences. */
  card: { first: 6000, later: 3800 },
  /** The question coming in. */
  entrance: 900,
} as const;

/** Moments inside the card beat (ms from its start). */
export const DEAL_MARKS = {
  /** "One of you has another. It may be you." */
  cardWarning: 2400,
} as const;
