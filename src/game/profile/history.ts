// A player's finished matches as their profile reads them (player_matches in
// migration 0030), and what the profile makes of them: each game's numbers
// and the curiosities. Every game reads its own part of a match.
import type { GameKey } from "../games";
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

/** What a fact tells, before it is weighed. */
type FactBody =
  | {
      kind: "partner";
      game: null;
      /** An account: guests leave no profile to name. */
      id: string;
      together: number;
      /** Matches where this player finished ahead of them. */
      ahead: number;
    }
  | {
      kind: "rival";
      game: null;
      id: string;
      together: number;
      /** Matches where they finished ahead of this player. */
      behind: number;
    }
  | {
      kind: "winStreak";
      game: null;
      /** Matches won in a row, any game. */
      wins: number;
    }
  | {
      kind: "favoriteGame";
      game: GameKey;
      matches: number;
    }
  | {
      kind: "fastest";
      game: "who-am-i";
      characterId: string | null;
      characterName: string;
      /** The jogada that discovered it (1 = the first). */
      at: number;
      timeMs: number | null;
    }
  | {
      kind: "hardest";
      game: "who-am-i";
      characterId: string | null;
      characterName: string;
      questions: number;
      /** Who got the card: an account's id, or null for a guest. */
      to: string | null;
    }
  | {
      kind: "sharpEye";
      game: "who-am-i";
      discovered: number;
      /** Matches played to the end. */
      tried: number;
    }
  | {
      kind: "theme";
      game: "who-am-i";
      theme: Theme;
      count: number;
    }
  | {
      kind: "escape";
      game: "impostor";
      /** The card they got away with. */
      characterName: string;
      /** Votes they took on the way; the fewest of all their escapes. */
      votes: number;
    }
  | {
      kind: "bullseye";
      game: "impostor";
      /** The crew's card, guessed right on the last chance (the latest one). */
      guess: string;
    }
  | {
      kind: "firstVote";
      game: "impostor";
      /** Matches where their first vote sent an impostor out. */
      count: number;
    }
  | {
      kind: "bargain";
      game: "lineup";
      /** The cheapest board that won a round (the latest of the cheapest). */
      spent: number;
      votes: number;
    }
  | {
      kind: "splurge";
      game: "lineup";
      /** The most paid for one character. */
      price: number;
    }
  | {
      kind: "crowd";
      game: "lineup";
      /** The crowd's prizes won. */
      count: number;
    };

/** Something a profile tells about its player; the browser words it. */
export type Fact = FactBody & {
  /** How telling it is for this player, 0–1; the profile shows the highest first. */
  score: number;
};

/** Facts a profile shows at most, the most telling ones. */
export const FACTS_SHOWN = 6;

/** Matches together before someone is the usual partner (or the rival). */
const PARTNER_MATCHES = 3;
/** Discoveries before one of them is worth calling the fastest. */
const FASTEST_AMONG = 2;
/** Questions a card picked must have held out against to be the hardest. */
const HARD_QUESTIONS = 5;
/** Matches on a theme before it is the favourite. */
const THEME_MATCHES = 3;
/** Wins in a row worth telling. */
const WIN_STREAK = 3;
/** Matches in a game before it is the favourite one. */
const FAVORITE_GAME_MATCHES = 5;
/** Cards tried, and the share discovered, before the player has a sharp eye. */
const SHARP_EYE_TRIED = 5;
const SHARP_EYE_RATE = 0.6;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** How telling the longest streak of days is (the browser counts it, in the reader's days). */
export const streakScore = (days: number) => clamp01(days / 14);

/**
 * The curiosities, each only when it says something (one discovery is not
 * the fastest, a card nobody asked about is not hard), most telling first.
 * A fact's score is how remarkable it is (a discovery on the first jogada
 * beats one on the fourth) times how much the player plays its game, so
 * someone who mostly plays the Impostor sees its facts first.
 */
export function factsOf(matches: readonly PlayedMatch[]): Fact[] {
  const facts: Fact[] = [];
  const played = new Map<GameKey, number>();
  for (const m of matches) played.set(m.game, (played.get(m.game) ?? 0) + 1);
  const weight = (game: GameKey | null) =>
    game === null
      ? 1
      : 0.5 + (0.5 * (played.get(game) ?? 0)) / Math.max(1, matches.length);
  const add = (body: FactBody, telling: number) =>
    facts.push({ ...body, score: clamp01(telling) * weight(body.game) });

  const mates = new Map<
    string,
    { together: number; ahead: number; behind: number }
  >();
  for (const m of matches) {
    for (const o of m.others) {
      if (o.guest) continue;
      const mate = mates.get(o.id) ?? { together: 0, ahead: 0, behind: 0 };
      mate.together += 1;
      if (m.place !== null && (o.place === null || m.place < o.place))
        mate.ahead += 1;
      if (o.place !== null && (m.place === null || o.place < m.place))
        mate.behind += 1;
      mates.set(o.id, mate);
    }
  }
  const partner = [...mates].sort(
    (a, b) => b[1].together - a[1].together || a[0].localeCompare(b[0]),
  )[0];
  if (partner && partner[1].together >= PARTNER_MATCHES) {
    const [id, { together, ahead }] = partner;
    add(
      { kind: "partner", game: null, id, together, ahead },
      together / matches.length,
    );
  }
  // the one who beats them most, when it is more often than they win
  const rival = [...mates]
    .filter(
      ([id, x]) =>
        id !== partner?.[0] &&
        x.together >= PARTNER_MATCHES &&
        x.behind > x.ahead,
    )
    .sort((a, b) => b[1].behind - a[1].behind || a[0].localeCompare(b[0]))[0];
  if (rival) {
    const [id, { together, behind }] = rival;
    add(
      { kind: "rival", game: null, id, together, behind },
      0.4 + (0.5 * behind) / together,
    );
  }

  let run = 0;
  let wins = 0;
  for (const m of matches) {
    run = m.place === 1 ? run + 1 : 0;
    wins = Math.max(wins, run);
  }
  if (wins >= WIN_STREAK)
    add({ kind: "winStreak", game: null, wins }, wins / 8);

  const favorite = [...played].sort((a, b) => b[1] - a[1])[0];
  if (played.size >= 2 && favorite && favorite[1] >= FAVORITE_GAME_MATCHES)
    add(
      { kind: "favoriteGame", game: favorite[0], matches: favorite[1] },
      0.3 + (0.4 * favorite[1]) / matches.length,
    );

  const parts = matches.flatMap((m) =>
    m.game === "who-am-i" && m.details ? [{ m, p: m.details }] : [],
  );

  const discovered = parts.filter(
    ({ p }) => p.discoveredAt !== null && p.characterName,
  );
  const fastest = [...discovered].sort(
    (a, b) =>
      (a.p.discoveredAt ?? 0) - (b.p.discoveredAt ?? 0) ||
      (a.m.timeMs ?? Infinity) - (b.m.timeMs ?? Infinity),
  )[0];
  if (fastest && discovered.length >= FASTEST_AMONG) {
    const at = fastest.p.discoveredAt as number;
    const avg =
      discovered.reduce((sum, { p }) => sum + (p.discoveredAt ?? 0), 0) /
      discovered.length;
    add(
      {
        kind: "fastest",
        game: "who-am-i",
        characterId: fastest.p.characterId,
        characterName: fastest.p.characterName as string,
        at,
        timeMs: fastest.m.timeMs,
      },
      at === 1 ? 1 : Math.max(0.2, 1 - at / avg),
    );
  }

  const hardest = parts
    .flatMap(({ m, p }) =>
      // someone who left gave up on the match, not on the card
      p.gave &&
      (p.gave.result === "gave_up" || p.gave.result === "not_found") &&
      p.gave.characterName
        ? [{ m, gave: p.gave }]
        : [],
    )
    .sort((a, b) => b.gave.questions - a.gave.questions)[0];
  if (hardest && hardest.gave.questions >= HARD_QUESTIONS) {
    const to = hardest.m.others.find((o) => o.id === hardest.gave.to);
    add(
      {
        kind: "hardest",
        game: "who-am-i",
        characterId: hardest.gave.characterId,
        characterName: hardest.gave.characterName as string,
        questions: hardest.gave.questions,
        to: to && !to.guest ? to.id : null,
      },
      hardest.gave.questions / 15,
    );
  }

  const eye = whoAmINumbers(matches);
  const tried = parts.filter(({ p }) => p.result !== "left").length;
  if (
    tried >= SHARP_EYE_TRIED &&
    eye.discoverRate !== null &&
    eye.discoverRate >= SHARP_EYE_RATE
  )
    add(
      { kind: "sharpEye", game: "who-am-i", discovered: eye.discovered, tried },
      (eye.discoverRate - 0.5) * 2,
    );

  const themes = new Map<string, { theme: Theme; count: number }>();
  for (const { p } of parts) {
    if (!p.themeId || !p.theme) continue;
    const t = themes.get(p.themeId) ?? { theme: p.theme, count: 0 };
    t.count += 1;
    themes.set(p.themeId, t);
  }
  const theme = [...themes.values()].sort((a, b) => b.count - a.count)[0];
  if (theme && theme.count >= THEME_MATCHES)
    add(
      { kind: "theme", game: "who-am-i", ...theme },
      (theme.count / parts.length) * Math.min(1, theme.count / 5),
    );

  // newest first, so a tie goes to the latest
  const imps = impostorParts(matches);
  const cleanest = imps
    .filter((p) => p.impostor && p.won && !p.left && p.characterName)
    .reduce<(typeof imps)[number] | null>(
      (best, p) => (!best || p.votesTaken < best.votesTaken ? p : best),
      null,
    );
  if (cleanest)
    add(
      {
        kind: "escape",
        game: "impostor",
        characterName: cleanest.characterName as string,
        votes: cleanest.votesTaken,
      },
      0.9 / (cleanest.votesTaken + 1),
    );
  const hit = imps.find((p) => p.guessHit && p.guess);
  if (hit)
    add(
      { kind: "bullseye", game: "impostor", guess: hit.guess as string },
      0.85,
    );
  const { firstVote } = impostorNumbers(matches);
  if (firstVote >= 2)
    add(
      { kind: "firstVote", game: "impostor", count: firstVote },
      firstVote / 5,
    );

  // newest first, so a tie goes to the latest
  const lus = lineupRounds(matches);
  const bargain = lus
    .filter((r) => r.won && r.spent <= BARGAIN_COINS)
    .reduce<LineupRoundStat | null>(
      (best, r) => (!best || r.spent < best.spent ? r : best),
      null,
    );
  if (bargain)
    add(
      {
        kind: "bargain",
        game: "lineup",
        spent: bargain.spent,
        votes: bargain.votes + (bargain.tieVotes ?? 0),
      },
      0.4 + (0.6 * (BARGAIN_COINS - bargain.spent)) / BARGAIN_COINS,
    );
  const splurge = Math.max(0, ...lus.map((r) => r.topPrice));
  if (splurge >= 5)
    add(
      { kind: "splurge", game: "lineup", price: splurge },
      splurge / (ALL_IN_COINS * 1.5),
    );
  const crowd = lus.filter((r) => r.crowd).length;
  if (crowd >= 2)
    add({ kind: "crowd", game: "lineup", count: crowd }, crowd / 5);

  return facts.sort((a, b) => b.score - a.score);
}
