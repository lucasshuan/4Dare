// The Workshop's rules, which the control panel can change (tune.ts): how many
// suggestions an account sends a week, how many items a page shows, which
// checks run on a new suggestion, and how the curators' queue is ordered.
//
// The queue's order: each vote weighs 1, plus a little per level of who cast
// it, per suggestion of theirs already live (up to 5) and more for curators
// and admins. The weighted share of "want it" is taken at the lower bound of
// its Wilson interval (z), so a handful of votes doesn't win by luck, and
// shrunk while there are few votes; the author's live suggestions add points.
// Nothing goes live on its own: a curator decides.
import { tunable } from "./tune";

export const WORKSHOP = tunable("workshop", {
  weekly: 3,
  page: 24,
  weight: { level: 0.1, live: 0.1, staff: 0.5 },
  author: 2,
  z: 1.28,
  checks: {
    near_theme: true,
    same_starters: true,
    no_picture: true,
    near_text: true,
    blocked_word: true,
  },
});

/** A vote as the queue weighs it. */
export interface WeighedVote {
  yes: boolean;
  /** The voter's level. */
  level: number;
  /** The voter's suggestions already live. */
  live: number;
  /** A curator or the admin. */
  staff: boolean;
}

/** What one vote weighs. */
export function voteWeight(v: Omit<WeighedVote, "yes">): number {
  const w = WORKSHOP.weight;
  return (
    1 +
    w.level * Math.max(0, v.level) +
    w.live * Math.min(5, Math.max(0, v.live)) +
    (v.staff ? w.staff : 0)
  );
}

/** The lower bound of the Wilson score interval of a share `p` out of `n`. */
export function wilsonLower(p: number, n: number, z: number): number {
  if (n <= 0) return 0;
  const z2 = z * z;
  const centre = p + z2 / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n);
  return Math.max(0, (centre - margin) / (1 + z2 / n));
}

/** A suggestion's place in the queue (higher first), to one decimal. */
export function priority(
  votes: readonly WeighedVote[],
  authorLive: number,
): number {
  let total = 0;
  let yes = 0;
  for (const v of votes) {
    const w = voteWeight(v);
    total += w;
    if (v.yes) yes += w;
  }
  const share = total ? wilsonLower(yes / total, total, WORKSHOP.z) : 0;
  const settled = 1 - 1 / (1 + votes.length / 4);
  const score =
    share * settled * 100 + WORKSHOP.author * Math.max(0, authorLive);
  return Math.round(score * 10) / 10;
}
