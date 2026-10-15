// What for?'s bots: they bid a coin over the lead now and then, pass the
// rest, say they're done with each break, trade and board, present at once
// and vote for anyone's board but their own.
import { LU_PHASES } from "../lineup/types";
import type { GameEvent, PlayerId, RoomState } from "../types";
import { type BotRandom, pick } from "./kit";

const DONE_PHASES = new Set(["halftime", "trading", "defending", "scoring"]);

export function lineupMove(
  s: RoomState,
  seat: PlayerId,
  random: BotRandom,
): GameEvent | null {
  const lu = s.lu;
  if (!lu || !(LU_PHASES as readonly string[]).includes(s.phase)) return null;
  const dealt = lu.dealt.includes(seat);
  const round = lu.rounds.at(-1);
  if (s.phase === "bidding") {
    if (!dealt || lu.passed.includes(seat)) return null;
    const lead = Math.max(0, ...Object.values(lu.bids));
    if (lu.bids[seat] === lead && lead > 0) return null;
    const coins = lu.coins[seat] ?? 0;
    if (lead + 1 > coins || random() < 0.45)
      return { type: "FOLD", playerId: seat };
    return { type: "BID", playerId: seat, amount: lead + 1 };
  }
  if (DONE_PHASES.has(s.phase))
    return dealt && !lu.done.includes(seat)
      ? { type: "DONE", playerId: seat, done: true }
      : null;
  if (s.phase === "presenting") {
    const owner = round?.order[lu.showing];
    return owner === seat ? { type: "PRESENTED", playerId: seat } : null;
  }
  if (s.phase === "judging" && round) {
    if (!dealt || round.votes[seat]) return null;
    const boards = lu.dealt.filter((id) => id !== seat);
    return boards.length
      ? {
          type: "JUDGE",
          playerId: seat,
          ownerId: boards[pick(random, boards.length)],
        }
      : null;
  }
  if (s.phase === "tiebreak" && round?.tie) {
    const tie = round.tie;
    if (!tie.voters.includes(seat) || tie.votes[seat]) return null;
    const among = tie.among.filter((id) => id !== seat);
    return among.length
      ? {
          type: "JUDGE",
          playerId: seat,
          ownerId: among[pick(random, among.length)],
        }
      : null;
  }
  if (s.phase === "choosing" && lu.presenter === seat)
    return { type: "MISSION", playerId: seat, pick: 0, text: null };
  if (s.phase === "verdict" && lu.presenter === seat) {
    const boards = lu.dealt;
    return boards.length
      ? {
          type: "VERDICT",
          playerId: seat,
          ownerId: boards[pick(random, boards.length)],
          why: "Esse time dá conta.",
          final: true,
        }
      : null;
  }
  return null;
}
