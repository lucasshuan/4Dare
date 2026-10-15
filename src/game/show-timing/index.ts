// How long each scene of a match's shows lasts, and the moments inside them. One file per scene, so
// each can be tuned by playing; the engine times the shows with these, the screens play inside them.
// Server-wide: reduced motion changes what a screen draws, never how long a beat lasts.
import { CAST, CAST_MARKS } from "./cast";
import { DEAL, DEAL_MARKS } from "./deal";
import { DRAW, DRAW_MARKS } from "./draw";
import { LINEUP, LINEUP_MARKS } from "./lineup";
import { OPENING, OPENING_MARKS } from "./opening";
import { PICK } from "./pick";
import { THEME, THEME_MARKS } from "./theme";

/** Beat lengths in ms; "first" is the room's first match (the long versions), "later" the ones after. */
// Getters for the number leaves: the scenes' constants are tunable (tune.ts), so
// every read goes back to them instead of keeping the value they had at load.
export const SHOW_TIMING = {
  get curtain() {
    return OPENING.curtain;
  },
  title: OPENING.title,
  get intro() {
    return OPENING.intro;
  },
  get round() {
    return OPENING.round;
  },
  get tieSpin() {
    return OPENING.tieSpin;
  },
  settle: OPENING.settle,
  theme: THEME.theme,
  rule: THEME.rule,
  draw: DRAW.draw,
  target: DRAW.target,
  get targetLead() {
    return DRAW.lead;
  },
  picked: PICK.picked,
  received: CAST.received,
  order: CAST.order,
  card: DEAL.card,
  entrance: {
    get vote() {
      return OPENING.entrance.vote;
    },
    get theming() {
      return OPENING.entrance.theming;
    },
    get pick() {
      return PICK.entrance;
    },
    turn: CAST.entrance,
    get reply() {
      return DEAL.entrance;
    },
  },
  /** What for?'s scenes. */
  lineup: LINEUP,
};

/** Several constants read as one, each key looked up live in the one that has it. */
function joined<T extends object[]>(
  ...parts: T
): UnionToIntersection<T[number]> {
  const owner = (key: string | symbol) => parts.find((p) => key in p);
  return new Proxy<object>(
    {},
    {
      get: (_, key) => {
        const o = owner(key);
        return o ? (o as Record<string | symbol, unknown>)[key] : undefined;
      },
      has: (_, key) => !!owner(key),
      ownKeys: () => [...new Set(parts.flatMap((p) => Reflect.ownKeys(p)))],
      getOwnPropertyDescriptor: (_, key) => {
        const o = owner(key);
        return o
          ? {
              configurable: true,
              enumerable: true,
              value: (o as Record<string | symbol, unknown>)[key],
            }
          : undefined;
      },
    },
  ) as UnionToIntersection<T[number]>;
}

type UnionToIntersection<U> = (
  U extends unknown
    ? (x: U) => void
    : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Moments inside a beat (ms from the beat's start), shared by the engine (chat
 * lines) and the screens. Clamp them into their beat: e2e runs scale beats down.
 */
export const SHOW_MARKS = joined(
  OPENING_MARKS,
  THEME_MARKS,
  DRAW_MARKS,
  CAST_MARKS,
  DEAL_MARKS,
  LINEUP_MARKS,
);
