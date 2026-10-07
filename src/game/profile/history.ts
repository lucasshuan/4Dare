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

export interface PlayedMatch {
  matchId: string;
  game: GameKey;
  finishedAt: number;
  place: number | null;
  timeMs: number | null;
  xp: number;
  others: MatchMate[];
  /** The game's own part; null when the game keeps none. */
  details: WhoAmIPart | null;
}

const won = (m: PlayedMatch) => m.place === 1;

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

/** Something a profile tells about its player; the browser words it. */
export type Fact =
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
      kind: "fastest";
      game: "who-am-i";
      characterName: string;
      /** The jogada that discovered it (1 = the first). */
      at: number;
      timeMs: number | null;
    }
  | {
      kind: "hardest";
      game: "who-am-i";
      characterName: string;
      questions: number;
      /** Who got the card: an account's id, or null for a guest. */
      to: string | null;
    }
  | {
      kind: "theme";
      game: "who-am-i";
      theme: Theme;
      count: number;
    };

/**
 * The curiosities: the account played with most, and "Who am I?"'s fastest
 * discovery, the card picked that held out longest and the favourite theme.
 */
export function factsOf(matches: readonly PlayedMatch[]): Fact[] {
  const facts: Fact[] = [];

  const mates = new Map<string, { together: number; ahead: number }>();
  for (const m of matches) {
    for (const o of m.others) {
      if (o.guest) continue;
      const mate = mates.get(o.id) ?? { together: 0, ahead: 0 };
      mate.together += 1;
      if (m.place !== null && (o.place === null || m.place < o.place))
        mate.ahead += 1;
      mates.set(o.id, mate);
    }
  }
  const partner = [...mates].sort(
    (a, b) => b[1].together - a[1].together || a[0].localeCompare(b[0]),
  )[0];
  if (partner && partner[1].together >= 2)
    facts.push({ kind: "partner", game: null, id: partner[0], ...partner[1] });

  const parts = matches.flatMap((m) =>
    m.game === "who-am-i" && m.details ? [{ m, p: m.details }] : [],
  );

  const fastest = parts
    .filter(({ p }) => p.discoveredAt !== null && p.characterName)
    .sort(
      (a, b) =>
        (a.p.discoveredAt ?? 0) - (b.p.discoveredAt ?? 0) ||
        (a.m.timeMs ?? Infinity) - (b.m.timeMs ?? Infinity),
    )[0];
  if (fastest)
    facts.push({
      kind: "fastest",
      game: "who-am-i",
      characterName: fastest.p.characterName as string,
      at: fastest.p.discoveredAt as number,
      timeMs: fastest.m.timeMs,
    });

  const hardest = parts
    .flatMap(({ m, p }) =>
      p.gave && p.gave.result !== "discovered" && p.gave.characterName
        ? [{ m, gave: p.gave }]
        : [],
    )
    .sort((a, b) => b.gave.questions - a.gave.questions)[0];
  if (hardest && hardest.gave.questions > 0) {
    const to = hardest.m.others.find((o) => o.id === hardest.gave.to);
    facts.push({
      kind: "hardest",
      game: "who-am-i",
      characterName: hardest.gave.characterName as string,
      questions: hardest.gave.questions,
      to: to && !to.guest ? to.id : null,
    });
  }

  const themes = new Map<string, { theme: Theme; count: number }>();
  for (const { p } of parts) {
    if (!p.themeId || !p.theme) continue;
    const t = themes.get(p.themeId) ?? { theme: p.theme, count: 0 };
    t.count += 1;
    themes.set(p.themeId, t);
  }
  const theme = [...themes.values()].sort((a, b) => b.count - a.count)[0];
  if (theme && theme.count >= 2)
    facts.push({ kind: "theme", game: "who-am-i", ...theme });

  return facts;
}
