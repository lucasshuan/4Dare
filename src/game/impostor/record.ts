// What an Impostor match leaves behind: each player's part (beside the
// shared match_players row) and what each question did, for its score.
import { GAME_XP, XP } from "../profile/xp";
import type { PlayerId, RoomState } from "../types";
import { SCALE_MAX, sameAnswer } from "./answers";
import type { ImpAnswer, ImpAsked, ImpostorMatch } from "./types";

/** A player's part in an Impostor match (table impostor_match_players). */
export interface ImpostorPlayerRecord {
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
}

export function impostorPart(
  imp: ImpostorMatch,
  id: PlayerId,
): ImpostorPlayerRecord {
  const out = imp.outs.find((o) => o.id === id);
  const right = imp.outs.filter(
    (o) => o.impostor && !o.left && o.by.includes(id),
  );
  return {
    impostor: imp.impostors.includes(id),
    outRound: out?.round ?? null,
    left: out?.left ?? false,
    rightVotes: right.length,
    firstRight: right.some((o) => o.round === 1),
    votesTaken: imp.votesTaken[id] ?? 0,
    guess: out?.guess ?? null,
    guessHit: out?.hit ?? null,
  };
}

/** Rounds an impostor got through without being caught. */
const roundsSurvived = (imp: ImpostorMatch, id: PlayerId) => {
  const out = imp.outs.find((o) => o.id === id);
  return out ? out.round - 1 : imp.round;
};

/**
 * The match's XP for a player: finishing, the winning side, right votes,
 * rounds an impostor got through and a right last guess.
 */
export function impostorXp(imp: ImpostorMatch, id: PlayerId): number {
  const part = impostorPart(imp, id);
  if (part.left) return 0;
  const won =
    imp.winner !== null && part.impostor === (imp.winner === "impostors");
  const X = GAME_XP.impostor;
  return (
    XP.finish +
    (won ? XP.first : 0) +
    X.rightVote * part.rightVotes +
    (part.impostor ? X.survived * roundsSurvived(imp, id) : 0) +
    (part.guessHit ? X.guessHit : 0)
  );
}

/** A question's part in the match, before the language is set. */
export interface QuestionPart {
  id: string;
  asked: number;
  silent: number;
  stoodOut: number;
  caught: number;
}

/** On a scale, this far from the others' middle answer stands out. */
const SCALE_APART = 3;

const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

/**
 * Whether an impostor stood apart when the answers showed: on a scale, at
 * least SCALE_APART from the crew's middle; otherwise the only one who
 * didn't give the crew's most common answer.
 */
export function stoodOut(imp: ImpostorMatch, q: ImpAsked): boolean {
  const entries = Object.entries(q.answers);
  const crew = entries.filter(([id]) => !imp.impostors.includes(id));
  const theirs = entries.filter(([id]) => imp.impostors.includes(id));
  if (!crew.length || !theirs.length) return false;
  if (q.question.kind === "scale") {
    const mid = median(crew.map(([, a]) => ("n" in a ? a.n : SCALE_MAX / 2)));
    return theirs.some(
      ([, a]) => "n" in a && Math.abs(a.n - mid) >= SCALE_APART,
    );
  }
  const common = mostCommon(crew.map(([, a]) => a));
  if (!common) return false;
  const others = entries.filter(([, a]) => !sameAnswer(a, common));
  return (
    others.length > 0 && others.every(([id]) => imp.impostors.includes(id))
  );
}

function mostCommon(answers: ImpAnswer[]): ImpAnswer | null {
  let best: ImpAnswer | null = null;
  let most = 0;
  for (const a of answers) {
    const n = answers.filter((b) => sameAnswer(a, b)).length;
    if (n > most) {
      best = a;
      most = n;
    }
  }
  return most > 1 ? best : null;
}

/** What each question did in a finished match: asked, unanswered, the impostor standing out, caught right after. */
export function questionParts(s: RoomState): QuestionPart[] {
  const imp = s.imp;
  if (!imp) return [];
  return imp.asked.map((q) => {
    // who was still in when it was asked
    const inThen = imp.dealt.filter(
      (id) => !imp.outs.some((o) => o.id === id && o.round < q.round),
    );
    return {
      id: q.question.id,
      asked: 1,
      silent: Math.max(0, inThen.length - Object.keys(q.answers).length),
      stoodOut: stoodOut(imp, q) ? 1 : 0,
      caught: imp.outs.some((o) => o.round === q.round && o.impostor && !o.left)
        ? 1
        : 0,
    };
  });
}
