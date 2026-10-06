// How long each scene of a match's shows lasts, and the moments inside them. One file per scene, so
// each can be tuned by playing; the engine times the shows with these, the screens play inside them.
// Server-wide: reduced motion changes what a screen draws, never how long a beat lasts.
import { CAST, CAST_MARKS } from "./cast";
import { DRAW, DRAW_MARKS } from "./draw";
import { OPENING, OPENING_MARKS } from "./opening";
import { PICK } from "./pick";
import { THEME, THEME_MARKS } from "./theme";

/** Beat lengths in ms; "first" is the room's first match (the long versions), "later" the ones after. */
export const SHOW_TIMING = {
  curtain: OPENING.curtain,
  intro: OPENING.intro,
  round: OPENING.round,
  tieSpin: OPENING.tieSpin,
  settle: OPENING.settle,
  theme: THEME.theme,
  rule: THEME.rule,
  draw: DRAW.draw,
  target: DRAW.target,
  targetLead: DRAW.lead,
  picked: PICK.picked,
  received: CAST.received,
  order: CAST.order,
  entrance: {
    vote: OPENING.entrance.vote,
    theming: OPENING.entrance.theming,
    pick: PICK.entrance,
    turn: CAST.entrance,
  },
} as const;

/**
 * Moments inside a beat (ms from the beat's start), shared by the engine (chat
 * lines) and the screens. Clamp them into their beat: e2e runs scale beats down.
 */
export const SHOW_MARKS = {
  ...OPENING_MARKS,
  ...THEME_MARKS,
  ...DRAW_MARKS,
  ...CAST_MARKS,
} as const;
