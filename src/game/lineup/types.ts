// What for? (lineup) in types: everyone gets coins each round and buys a team
// at auction, one card at a time, without knowing what the team is for. Then
// trades, the envelope with the mission, a board to defend the team, the
// boards on stage one by one, and a secret vote. The room's shared parts
// (seats, shows, clocks) are in ../types.ts.
import type { Gosto } from "../gostos";
import type { Localized, Phase, PlayerId } from "../types";

/** What for?'s steps, from the first lot to the last score. */
export const LU_PHASES = [
  "bidding",
  "halftime",
  "trading",
  "defending",
  "presenting",
  "judging",
  "tiebreak",
  "scoring",
] as const satisfies readonly Phase[];

/**
 * A card that goes under the hammer: a library character in the room's
 * language, or an extra (plain folk drawn by hand: an emoji on a tint).
 */
export interface LuCard {
  /** Library id ("wd-Q302"), or "x:<id>" for an extra. */
  id: string;
  name: string;
  /** The work or the job; null for an extra. */
  origin: string | null;
  /** Null for an extra: it shows `emoji` on `tint` instead. */
  imageUrl: string | null;
  emoji?: string;
  tint?: string;
  gosto?: Gosto;
  /** One of the language's best known: it pulls a fight. */
  star?: true;
}

/** The mission in the envelope: from the bank, the same text in every language it has. */
export interface LuMission {
  /** The bank's id; null when somebody typed it. */
  id: string | null;
  text: Localized;
}

/**
 * One round's cards and mission, dealt by the server at the start. The
 * first `lots` cards go under the hammer in order; the rest are spares for a
 * team left empty when no lot is left over.
 */
export interface LuDeck {
  cards: LuCard[];
  lots: number;
  mission: LuMission;
}

/** The price tag a card wears on the board: who paid, and how much (0: a free leftover). */
export interface LuTag {
  by: PlayerId | null;
  price: number;
}

/** A photo on a board: card index, centre (x, y) on the slate, width, tilt in degrees. */
export interface LuSticker {
  c: number;
  x: number;
  y: number;
  w: number;
  r: number;
}

/** Chalk words on a board: centre (x, y), font size, tilt in degrees. */
export interface LuText {
  t: string;
  x: number;
  y: number;
  s: number;
  r: number;
}

/**
 * A board as its owner laid it out, in slate units (SLATE): stickers for the
 * cards they hold (missing ones sit where the grid puts them), free text and
 * the team's name.
 */
export interface LuBoard {
  name: string;
  stickers: LuSticker[];
  texts: LuText[];
}

/** An open trade: `from` gives `give` (their cards) for `get` (`to`'s cards). */
export interface LuOffer {
  from: PlayerId;
  to: PlayerId;
  give: number[];
  get: number[];
}

/** A trade that went through. */
export interface LuTrade extends LuOffer {
  at: number;
}

/** The tiebreak: those whose vote went to a board outside the tie choose again among the tied. */
export interface LuTie {
  among: PlayerId[];
  voters: PlayerId[];
  votes: Record<PlayerId, PlayerId>;
}

/** One round, from the first lot to the score; past rounds stay for the result and the record. */
export interface LuRound {
  n: number;
  /** Cards each player holds, in the order they got them (card indexes into the deck). */
  hands: Record<PlayerId, number[]>;
  /** The tag on each card that changed hands at auction or as a leftover. */
  tags: Record<number, LuTag>;
  /** Lots nobody bid on, in order: they go to empty teams first. */
  leftovers: number[];
  /** Coins left at the end of the auction, by player. */
  change: Record<PlayerId, number>;
  trades: LuTrade[];
  /** Saved quietly while defending; missing: the grid as the cards came. */
  boards: Record<PlayerId, LuBoard>;
  /** The order the boards go on stage. */
  order: PlayerId[];
  /** Reactions on each board (owner → reactor → counts per REACTIONS emoji). */
  reactions: Record<PlayerId, Record<PlayerId, number[]>>;
  /** Voter → the board's owner. Secret until the tally. */
  votes: Record<PlayerId, PlayerId>;
  tie: LuTie | null;
  winners: PlayerId[];
  /** Most reactions on stage, alone at the top. */
  crowd: PlayerId | null;
  points: Record<PlayerId, number>;
  /** "Good mission?" from the score, by player. */
  rated: Record<PlayerId, 1 | -1>;
}

export interface LineupMatch {
  /** Everyone in when it started, in seat order: they bid, defend and vote. */
  dealt: PlayerId[];
  decks: LuDeck[];
  /** The round under way, 1-based. */
  round: number;
  rounds: LuRound[];
  /** Coins left this round. */
  coins: Record<PlayerId, number>;
  /** The lot on the table (index into the deck); -1 before the first. */
  lot: number;
  /** Each bidder's latest offer on the open lot; the highest leads. */
  bids: Record<PlayerId, number>;
  /** Out of the open lot; a new bid takes them back in. */
  passed: PlayerId[];
  /** Lot indexes after which the auction stops for a break. */
  breaks: number[];
  /** Open trade offers, one per player at most. */
  offers: LuOffer[];
  /** Done with the step (break, trades, board, score); each one cut the clock by `cuts`. */
  done: PlayerId[];
  cuts: Record<PlayerId, number>;
  /** The board on stage (index into the round's order). */
  showing: number;
}

/** The reactions on stage, in order. */
export const REACTIONS = ["😂", "🔥", "💀", "👏"] as const;

// ---------------------------------------------------------------------------
// What one player may see. The mission waits for the envelope; the votes stay
// secret until the tally; the other boards wait for the stage.
// ---------------------------------------------------------------------------

/** A finished round as the score and the podium show it. */
export interface LuRoundView {
  n: number;
  mission: LuMission;
  winners: PlayerId[];
  crowd: PlayerId | null;
  points: Record<PlayerId, number>;
  /** Votes each board got, the tiebreak's apart. */
  votes: Record<PlayerId, number>;
  tieVotes: Record<PlayerId, number> | null;
  /** Reactions each board got. */
  laughs: Record<PlayerId, number>;
  /** The winners' boards and the cards on them. */
  boards: Record<PlayerId, LuBoard>;
  cards: Record<number, LuCard>;
  tags: Record<number, LuTag>;
}

export interface LineupView {
  round: number;
  rounds: number;
  /** Everyone dealt in: they bid, defend and vote. */
  dealtIds: PlayerId[];
  coins: Record<PlayerId, number>;
  /** Lots in this round. */
  lots: number;
  /** This round's cards the viewer may see (by index): those already on the table, and the next lot. */
  cards: Record<number, LuCard>;
  /** The lot on the table (or just sold, while its scene plays): its towers. */
  lot: {
    i: number;
    bids: Record<PlayerId, number>;
    passedIds: PlayerId[];
    leaderId: PlayerId | null;
    price: number;
    /** The lot after it, shown small in the corner; null on the last. */
    next: number | null;
  } | null;
  /** Lot indexes after which the auction breaks. */
  breaks: number[];
  hands: Record<PlayerId, number[]>;
  tags: Record<number, LuTag>;
  leftovers: number[];
  offers: LuOffer[];
  trades: LuTrade[];
  doneIds: PlayerId[];
  /** From the envelope on. */
  mission: LuMission | null;
  /** Yours while defending; on stage, those shown so far; everyone's from the vote on. */
  boards: Record<PlayerId, LuBoard>;
  order: PlayerId[];
  showing: number;
  /** Reactions per board, per emoji (boards already on stage). */
  reactions: Record<PlayerId, number[]>;
  /** How many reactions you can still send the board on stage. */
  reactLeft: number;
  vote: {
    votedIds: PlayerId[];
    yours: PlayerId | null;
    /** Everyone's, from the tally on. */
    votes: Record<PlayerId, PlayerId> | null;
  } | null;
  tie: {
    among: PlayerId[];
    voterIds: PlayerId[];
    votedIds: PlayerId[];
    yours: PlayerId | null;
    votes: Record<PlayerId, PlayerId> | null;
  } | null;
  /** Rounds already scored, the one on screen included. */
  results: LuRoundView[];
  totals: Record<PlayerId, number>;
  rated: 1 | -1 | null;
}
