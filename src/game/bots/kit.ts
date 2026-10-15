import type { Character } from "../types";

/** What the bots draw from: the cards they pick, the questions they ask, the room's language. */
export interface BotKit {
  characters: Character[];
  questions: string[];
  /** Typed by a host bot when the theme is theirs to type. */
  typedTheme: string;
}

export type BotRandom = () => number;

/** A whole number from 0 to n − 1. */
export const pick = (random: BotRandom, n: number) =>
  Math.min(n - 1, Math.floor(random() * n));
