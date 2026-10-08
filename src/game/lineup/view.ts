// What one player may see of a What for? match: every purse and team (the
// auction is public), the lots up to the next one, the mission from the
// envelope on, their own board while defending, the others on stage, and the
// votes only once they are counted.
import type { PlayerId, PlayerStatus, RoomPlayer, RoomState } from "../types";
import { boardsOf, inPlay, leaderOf, reactionsOn } from "./engine";
import { luTotals } from "./places";
import { boardOf, REACT_MAX } from "./rules";
import {
  type LineupView,
  type LuBoard,
  type LuCard,
  type LuRound,
  type LuRoundView,
  REACTIONS,
} from "./types";

/** Phases after the envelope opened. */
const MISSION_OUT = new Set([
  "defending",
  "presenting",
  "judging",
  "tiebreak",
  "scoring",
  "finished",
]);
const SCORED = new Set(["scoring", "finished"]);

const tally = (votes: Record<PlayerId, PlayerId>) => {
  const n: Record<PlayerId, number> = {};
  for (const owner of Object.values(votes)) n[owner] = (n[owner] ?? 0) + 1;
  return n;
};

function roundView(s: RoomState, round: LuRound): LuRoundView | null {
  const lu = s.lu;
  const deck = lu?.decks[round.n - 1];
  if (!lu || !deck) return null;
  const boards: Record<PlayerId, LuBoard> = {};
  const cards: Record<number, LuCard> = {};
  for (const id of round.winners) {
    const hand = round.hands[id] ?? [];
    boards[id] = boardOf(round.boards[id], hand);
    for (const c of hand) cards[c] = deck.cards[c];
  }
  return {
    n: round.n,
    mission: deck.mission,
    winners: [...round.winners],
    crowd: round.crowd,
    points: { ...round.points },
    votes: tally(round.votes),
    tieVotes: round.tie ? tally(round.tie.votes) : null,
    laughs: Object.fromEntries(
      lu.dealt.map((id) => [id, reactionsOn(round, id)]),
    ),
    boards,
    cards,
    tags: Object.fromEntries(
      Object.keys(cards).map((c) => [c, round.tags[Number(c)]]),
    ),
  };
}

export function luView(s: RoomState, viewer: PlayerId): LineupView | null {
  const lu = s.lu;
  if (!lu) return null;
  const round = lu.rounds.at(-1);
  const deck = lu.decks[lu.round - 1];
  if (!round || !deck) return null;
  const phase = s.phase;
  const auction = phase === "bidding" || phase === "halftime";
  const scored = SCORED.has(phase);

  // the cards on the table so far, the next lot, and whatever went to a team
  const seen = new Set<number>();
  const upTo = auction ? Math.min(deck.lots - 1, lu.lot + 1) : deck.lots - 1;
  for (let i = 0; i <= upTo; i++) seen.add(i);
  for (const hand of Object.values(round.hands))
    for (const c of hand) seen.add(c);
  const cards: Record<number, LuCard> = {};
  for (const i of seen) if (deck.cards[i]) cards[i] = deck.cards[i];

  const lead = leaderOf(lu);
  const all = boardsOf(round);
  const boards: Record<PlayerId, LuBoard> = {};
  if (phase === "defending") {
    if (all[viewer]) boards[viewer] = all[viewer];
  } else if (phase === "presenting") {
    for (const id of round.order.slice(0, lu.showing + 1)) boards[id] = all[id];
  } else if (MISSION_OUT.has(phase)) Object.assign(boards, all);

  const onStage = phase === "presenting" ? round.order[lu.showing] : null;
  const shown =
    phase === "presenting"
      ? round.order.slice(0, lu.showing + 1)
      : MISSION_OUT.has(phase) && phase !== "defending"
        ? round.order
        : [];
  const reactions = Object.fromEntries(
    shown.map((id) => [
      id,
      REACTIONS.map((_, k) =>
        Object.values(round.reactions[id] ?? {}).reduce(
          (a, counts) => a + (counts[k] ?? 0),
          0,
        ),
      ),
    ]),
  );
  const sent = onStage
    ? (round.reactions[onStage]?.[viewer] ?? []).reduce((a, b) => a + b, 0)
    : 0;

  const counted = scored || phase === "tiebreak";
  const judging = phase === "judging" || counted;
  const tie = round.tie;
  const results = lu.rounds
    .filter((r) => r.n < lu.round || scored)
    .flatMap((r) => roundView(s, r) ?? []);

  return {
    round: lu.round,
    rounds: lu.decks.length,
    dealtIds: [...lu.dealt],
    coins: { ...lu.coins },
    lots: deck.lots,
    cards,
    lot:
      auction && lu.lot >= 0
        ? {
            i: lu.lot,
            bids: { ...lu.bids },
            passedIds: [...lu.passed],
            leaderId: lead.id,
            price: lead.price,
            next: lu.lot + 1 < deck.lots ? lu.lot + 1 : null,
          }
        : null,
    breaks: [...lu.breaks],
    hands: structuredClone(round.hands),
    tags: structuredClone(round.tags),
    leftovers: [...round.leftovers],
    offers: structuredClone(lu.offers),
    trades: structuredClone(round.trades),
    doneIds: [...lu.done],
    mission: MISSION_OUT.has(phase) ? structuredClone(deck.mission) : null,
    boards,
    order:
      phase === "presenting" || MISSION_OUT.has(phase) ? [...round.order] : [],
    showing: lu.showing,
    reactions,
    reactLeft: onStage && onStage !== viewer ? REACT_MAX - sent : 0,
    vote: judging
      ? {
          votedIds: Object.keys(round.votes),
          yours: round.votes[viewer] ?? null,
          votes: counted ? { ...round.votes } : null,
        }
      : null,
    tie: tie
      ? {
          among: [...tie.among],
          voterIds: [...tie.voters],
          votedIds: Object.keys(tie.votes),
          yours: tie.votes[viewer] ?? null,
          votes: scored ? { ...tie.votes } : null,
        }
      : null,
    results,
    totals: luTotals(lu),
    rated: round.rated[viewer] ?? null,
  };
}

/** A player's status in a What for? step, or null outside them. */
export function luStatus(s: RoomState, p: RoomPlayer): PlayerStatus | null {
  const lu = s.lu;
  if (!lu) return null;
  const playing = inPlay(s).includes(p.id);
  const round = lu.rounds.at(-1);
  switch (s.phase) {
    case "bidding":
      if (!playing) return "waiting";
      return lu.passed.includes(p.id) ? "passed" : "bidding";
    case "halftime":
    case "trading":
    case "defending":
    case "scoring":
      if (!playing) return "waiting";
      return lu.done.includes(p.id) ? "done" : "working";
    case "presenting":
      return round?.order[lu.showing] === p.id ? "presenting" : "waiting";
    case "judging":
      if (!playing) return "waiting";
      return round?.votes[p.id] !== undefined ? "judged" : "judging";
    case "tiebreak":
      if (!round?.tie?.voters.includes(p.id) || !playing) return "waiting";
      return round.tie.votes[p.id] !== undefined ? "judged" : "judging";
    default:
      return null;
  }
}
