// A player's finished matches as their profile reads them (player_matches in
// migration 0030), and what the profile makes of them: each game's numbers.
// Every game reads its own part of a match.
import type { PlayerResult } from "../record";
import type { Theme } from "../types";

/** Who else played a match, and where they ended. */
export interface MatchMate {
  id: string;
  place: number | null;
  guest: boolean;
}

/** "Who am I?"'s part of a player's match: their card, and the one they picked for someone. */
export interface WhoAmIPart {
  themeId: string | null;
  theme: Theme | null;
  result: PlayerResult;
  questions: number;
  guesses: number;
  discoveredAt: number | null;
  characterId: string | null;
  characterName: string | null;
  pickedBy: string | null;
  gave: {
    to: string;
    characterId: string | null;
    characterName: string | null;
    result: PlayerResult;
    questions: number;
  } | null;
}

/** The Impostor's part of a player's match: their side, how it went for them, their card. */
export interface ImpostorPart {
  themeId: string | null;
  theme: Theme | null;
  impostor: boolean;
  /** The round they went out in; null: still in at the end. */
  outRound: number | null;
  left: boolean;
  /** Votes of theirs that helped send an impostor out. */
  rightVotes: number;
  /** Their vote in the match's first vote sent an impostor out. */
  firstRight: boolean;
  /** Confirmed votes they took over the match. */
  votesTaken: number;
  guess: string | null;
  guessHit: boolean | null;
  characterName: string | null;
}

/** One of a player's What for? rounds: their board's price and how it did (the board itself waits for the Boards tab). */
export interface LineupRoundStat {
  round: number;
  missionId: string | null;
  /** Coins the board's cards cost. */
  spent: number;
  /** The most paid for one of them. */
  topPrice: number;
  votes: number;
  tieVotes: number | null;
  /** Reactions on stage. */
  laughs: number;
  won: boolean;
  /** The crowd's prize. */
  crowd: boolean;
  points: number;
  /** Cards on the board. */
  cards: number;
}

/** What for?'s part of a player's match: their rounds, or the rounds they presented. */
export interface LineupPart {
  rounds: LineupRoundStat[];
  /** Rounds presented (from the TV chair): no board, no points. */
  presented?: number;
}

interface MatchBase {
  matchId: string;
  finishedAt: number;
  place: number | null;
  timeMs: number | null;
  xp: number;
  others: MatchMate[];
}

/** A finished match as its player's profile reads it; `details` is the game's own part (null when missing). */
export type PlayedMatch = MatchBase &
  (
    | { game: "who-am-i"; details: WhoAmIPart | null }
    | { game: "impostor"; details: ImpostorPart | null }
    | { game: "lineup"; details: LineupPart | null }
  );

const won = (m: PlayedMatch) => m.place === 1;

/** The Impostor's parts of these matches, with whether that player's side won. */
export const impostorParts = (matches: readonly PlayedMatch[]) =>
  matches.flatMap((m) =>
    m.game === "impostor" && m.details ? [{ ...m.details, won: won(m) }] : [],
  );

/** What for?'s rounds over these matches, newest match first. */
export const lineupRounds = (matches: readonly PlayedMatch[]) =>
  matches.flatMap((m) =>
    m.game === "lineup" && m.details ? m.details.rounds : [],
  );

/** What for? matches presented from the TV chair. */
export const presentedMatches = (matches: readonly PlayedMatch[]) =>
  matches.filter((m) => m.game === "lineup" && (m.details?.presented ?? 0) > 0)
    .length;

/** A round won with a team this cheap or cheaper is a bargain. */
export const BARGAIN_COINS = 4;
/** Paying this much for one character goes all in. */
export const ALL_IN_COINS = 10;

/** Every game's numbers: matches, wins, time played. */
export function totalsOf(matches: readonly PlayedMatch[]) {
  return {
    matches: matches.length,
    wins: matches.filter(won).length,
    timeMs: matches.reduce((sum, m) => sum + (m.timeMs ?? 0), 0),
    xp: matches.reduce((sum, m) => sum + m.xp, 0),
  };
}

/** "Who am I?"'s own numbers: how often the card was discovered and in how many questions. */
export function whoAmINumbers(matches: readonly PlayedMatch[]) {
  const parts = matches.flatMap((m) =>
    m.game === "who-am-i" && m.details ? [m.details] : [],
  );
  const discovered = parts.filter((p) => p.result === "discovered");
  // leaving says nothing about how good one is at guessing
  const tried = parts.filter((p) => p.result !== "left");
  const questions = discovered.map((p) => p.questions);
  return {
    discovered: discovered.length,
    /** Share of the matches played to the end where the card was discovered, 0–1. */
    discoverRate: tried.length ? discovered.length / tried.length : null,
    avgQuestions: questions.length
      ? questions.reduce((a, b) => a + b, 0) / questions.length
      : null,
    bestQuestions: questions.length ? Math.min(...questions) : null,
  };
}

/** The Impostor's own numbers: impostors caught and how it went as one. */
export function impostorNumbers(matches: readonly PlayedMatch[]) {
  const parts = impostorParts(matches).filter((p) => !p.left);
  const asImpostor = parts.filter((p) => p.impostor);
  const crew = parts.filter((p) => !p.impostor);
  return {
    /** Votes that helped send an impostor out. */
    caught: parts.reduce((sum, p) => sum + p.rightVotes, 0),
    /** Of those, right in the match's first vote. */
    firstVote: parts.filter((p) => p.firstRight).length,
    crewMatches: crew.length,
    asImpostor: asImpostor.length,
    /** Share of the matches as an impostor that the impostors won, 0–1. */
    escapeRate: asImpostor.length
      ? asImpostor.filter((p) => p.won).length / asImpostor.length
      : null,
  };
}

/** What for?'s own numbers: rounds won, votes the boards got, the crowd's prizes. */
export function lineupNumbers(matches: readonly PlayedMatch[]) {
  const rounds = lineupRounds(matches);
  const spent = rounds.map((r) => r.spent);
  return {
    rounds: rounds.length,
    roundsWon: rounds.filter((r) => r.won).length,
    votes: rounds.reduce((sum, r) => sum + r.votes + (r.tieVotes ?? 0), 0),
    crowd: rounds.filter((r) => r.crowd).length,
    /** Matches presented from the TV chair. */
    presented: presentedMatches(matches),
    /** Coins a board cost, on average. */
    avgSpent: spent.length
      ? spent.reduce((a, b) => a + b, 0) / spent.length
      : null,
  };
}
