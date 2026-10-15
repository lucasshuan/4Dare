// The chosen theme takes the stage, then (first match only) the rule. Lengths in ms.

import { tunable } from "../tune";

export const THEME = tunable("theme", {
  /** The winner goes to the centre; shorter when the rule follows. */
  theme: { withRule: 2600, alone: 3000 },
  /** First match only: ✓✓✗ cards, or the sentence alone (typed theme, no examples). */
  rule: { cards: 4800, sentence: 2800 },
});

/** Moments inside the theme beat (ms from its start). */
export const THEME_MARKS = tunable("themeMarks", {
  /** The theme's colour and its set's glyphs come in, with confetti. */
  themeWash: 900,
  /** The chat's "Theme: …" line. */
  themeLine: 1000,
  /** The header's theme tag pops in. */
  themeTag: 2300,
});
