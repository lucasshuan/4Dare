// What a match gave one player, line by line, as the end's reward card lists
// it: the same sums as the record's XP (record.ts), taken apart.
import type { MatchRecord, PlayerRecord } from "../record";
import { BADGES, type BadgeId, badgeValues, tierOf } from "./badges";
import type { PlayedMatch } from "./history";
import { GAME_XP, levelOf, XP } from "./xp";

/** One line of the card: what it was for, how many (a round, votes) and its XP. */
export type RewardRow =
  | { kind: "finish" | "first" | "won" | "guessHit" | "dayFirst"; xp: number }
  /** Who am I?: the round they found their character in. */
  | { kind: "discovered"; round: number; xp: number }
  /** What for?: one line per round won. */
  | { kind: "roundWon"; round: number; xp: number }
  | {
      kind: "rightVote" | "votes" | "crowd" | "presented";
      n: number;
      xp: number;
    }
  /** The Impostor: rounds got through as an impostor; `free`: never caught. */
  | { kind: "survived"; n: number; free: boolean; xp: number };

/** Where a level stands: the level, the XP into it and what it costs. */
export type LevelAt = ReturnType<typeof levelOf>;

export interface MatchReward {
  rows: RewardRow[];
  /** The rows' sum. */
  xp: number;
  /** An account's level before and after the match; null for a guest (their XP waits for an account). */
  level: { before: LevelAt; after: LevelAt } | null;
  /** A badge tier the match reached for the first time. */
  badge: { id: BadgeId; tier: number; goal: number } | null;
}

/** The lines of a player's part in a match, the day's first match bonus apart. */
export function rewardRows(
  match: Pick<MatchRecord, "game" | "lineup">,
  p: PlayerRecord,
): RewardRow[] {
  if (p.result === "left") return [];
  if (p.role === "host") {
    const n = match.lineup?.rounds.length ?? 0;
    return n
      ? [{ kind: "presented", n, xp: n * GAME_XP.lineup.presented }]
      : [];
  }
  const rows: RewardRow[] = [{ kind: "finish", xp: XP.finish }];
  if (p.place === 1)
    rows.push({
      kind: match.game === "impostor" ? "won" : "first",
      xp: XP.first,
    });
  if (match.game === "who-am-i" && p.result === "discovered")
    rows.push({
      kind: "discovered",
      round: p.discoveredAt ?? 0,
      xp: GAME_XP["who-am-i"].discovered,
    });
  const imp = p.impostor;
  if (imp) {
    const X = GAME_XP.impostor;
    if (imp.rightVotes)
      rows.push({
        kind: "rightVote",
        n: imp.rightVotes,
        xp: imp.rightVotes * X.rightVote,
      });
    if (imp.guessHit) rows.push({ kind: "guessHit", xp: X.guessHit });
    // the rounds an impostor got through are the rest of the record's sum
    const rest = p.xp - sum(rows);
    if (imp.impostor && rest >= X.survived)
      rows.push({
        kind: "survived",
        n: Math.floor(rest / X.survived),
        free: imp.outRound === null,
        xp: rest,
      });
  }
  if (p.lineup) {
    const X = GAME_XP.lineup;
    for (const r of p.lineup)
      if (r.won)
        rows.push({ kind: "roundWon", round: r.round, xp: X.roundWon });
    const votes = p.lineup.reduce((n, r) => n + r.votes + (r.tieVotes ?? 0), 0);
    if (votes) rows.push({ kind: "votes", n: votes, xp: votes * X.vote });
    const crowd = p.lineup.filter((r) => r.crowd).length;
    if (crowd) rows.push({ kind: "crowd", n: crowd, xp: crowd * X.crowd });
  }
  return rows;
}

const sum = (rows: readonly RewardRow[]) => rows.reduce((n, r) => n + r.xp, 0);

/**
 * The whole reward of a player's part in `match`. An account's `history`
 * (newest first, this match included once saved) gives its level and badges:
 * the day's bonus is in this match's saved XP when it was their first that day.
 */
export function matchReward(
  match: Pick<MatchRecord, "id" | "game" | "lineup">,
  p: PlayerRecord,
  history: readonly PlayedMatch[] | null,
): MatchReward {
  const rows = rewardRows(match, p);
  if (!history) return { rows, xp: sum(rows), level: null, badge: null };
  const saved = history.find((m) => m.matchId === match.id);
  const before = history.filter((m) => m !== saved);
  const bonus = saved ? saved.xp - p.xp : 0;
  if (bonus > 0) rows.push({ kind: "dayFirst", xp: bonus });
  const total = before.reduce((n, m) => n + m.xp, 0);
  const xp = sum(rows);
  return {
    rows,
    xp,
    level: { before: levelOf(total), after: levelOf(total + xp) },
    badge: saved ? newBadge(before, history) : null,
  };
}

const NO_CONTRIBUTIONS = { pictures: 0, covers: 0, characters: 0 };

/** The first badge tier the matches reach that the ones before didn't (the library's aside). */
function newBadge(
  before: readonly PlayedMatch[],
  after: readonly PlayedMatch[],
): MatchReward["badge"] {
  const was = badgeValues([...before], NO_CONTRIBUTIONS);
  const is = badgeValues([...after], NO_CONTRIBUTIONS);
  for (const b of BADGES) {
    if (b.group === "library") continue;
    const from = tierOf(b.goals, was[b.id]).tier;
    const to = tierOf(b.goals, is[b.id]).tier;
    if (to > from) return { id: b.id, tier: to, goal: b.goals[to - 1] };
  }
  return null;
}
