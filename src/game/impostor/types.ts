// The Impostor in types: everyone gets the same character but the impostors,
// who get a neighbour of it and don't know it. Questions about the card,
// answered with a tap, then a vote to send someone out, until the impostors
// are out or as many as the rest. The room's shared parts (seats, theme vote,
// shows, clocks) are in ../types.ts.
import type { Character, PlayerId } from "../types";

/** How a question is answered. */
export const QUESTION_KINDS = [
  "scale",
  "color",
  "emoji",
  "pick",
  "word",
] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/** A question as the match carries it: its text lives in the question bank (by id). */
export interface ImpQuestion {
  id: string;
  kind: QuestionKind;
  /** How many answers it offers: 10 on a scale, the palette's size, a pick's options; 0 for a word. */
  choices: number;
  /** 1 light, 3 gives a lot away: never in the first round. */
  spice: 1 | 2 | 3;
}

/** An answer: a number (scale 1..10, or the index of a colour, emoji or option), or a word. */
export type ImpAnswer = { n: number } | { word: string };

/** The two cards of a match, as the server drew them for a theme. */
export interface ImpPair {
  crew: Character;
  impostor: Character;
}

/** What the server prepares for each theme in the vote: the cards, spares and the questions in order. */
export interface ImpDeal extends ImpPair {
  /** Other pairs of the theme, for "I don't know this one", used in order. */
  spares: ImpPair[];
  questions: ImpQuestion[];
}

/** A question asked in the match, with everyone's answers. */
export interface ImpAsked {
  /** The vote round it belongs to (1 = before the first vote). */
  round: number;
  question: ImpQuestion;
  /** Answers by player; missing until they answer. Who never answered stays missing. */
  answers: Record<PlayerId, ImpAnswer>;
  /** What each answer took off the clock (ms): it comes back if the answer is taken back. */
  cuts: Record<PlayerId, number>;
  /** Answering is over and everyone sees them. */
  revealed: boolean;
}

/** The vote of a round: pointing is free and shown to all; a confirmed vote counts and cuts the clock. */
export interface ImpVote {
  round: number;
  points: Record<PlayerId, PlayerId>;
  votes: Record<PlayerId, PlayerId>;
  cuts: Record<PlayerId, number>;
}

/** Someone the vote sent out (or who left the match). */
export interface ImpOut {
  id: PlayerId;
  round: number;
  impostor: boolean;
  /** Left the match instead of being voted out. */
  left: boolean;
  /** Who confirmed a vote on them in the vote that sent them out. */
  by: PlayerId[];
  /** A caught impostor's last chance: their guess at the crew's card (secret until the end). */
  guess: string | null;
  hit: boolean | null;
}

export type ImpWinner = "crew" | "impostors";

export interface ImpostorMatch {
  crew: Character;
  impostor: Character;
  spares: ImpPair[];
  /** The questions still to ask, in order. */
  queue: ImpQuestion[];
  /** Everyone dealt in, in seat order. */
  dealt: PlayerId[];
  /** Who holds the impostor card. Nobody is told, not even them. */
  impostors: PlayerId[];
  asked: ImpAsked[];
  /** The current round's vote, while talking and while its result shows. */
  vote: ImpVote | null;
  outs: ImpOut[];
  /** The vote round under way (1 = the first). */
  round: number;
  /** Times the cards were swapped because someone didn't know theirs. */
  swaps: number;
  /** The caught impostor guessing the crew's card now. */
  guessing: PlayerId | null;
  winner: ImpWinner | null;
  /** Why it ended: all impostors out, as many impostors as crew, or the rounds ran out. */
  reason: "caught" | "even" | "rounds" | "left" | null;
}
