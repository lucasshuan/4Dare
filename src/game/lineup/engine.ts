// What for?'s rules, on the room's shared state. Pure like the engine: the
// server deals the cards and the missions (LuDeck), the clock is ctx.now.
//
// A round: lots one by one (bid, pass, sold; a break in the middle), the end
// of the auction (an empty team gets a leftover), trades, the envelope, the
// boards, each board on stage, a secret vote (a tiebreak only for those who
// voted outside the tie), the score. Then the next round, or the podium.
import { findPlayer, isPresent } from "../helpers";
import { votesMs } from "../show-timing/lineup";
import {
  fail,
  finish,
  guardStep,
  longShows,
  type Part,
  requireSeated,
  shuffle,
  stage,
  startStep,
  stepMs,
} from "../steps";
import { type Ctx, type PlayerId, type RoomState, SHOW_TIMING } from "../types";
import {
  boardOf,
  breaksFor,
  CROWD_MIN,
  cleanBoard,
  LU_CLOCKS,
  LU_FLOORS,
  lotsFor,
  REACT_MAX,
  roundsFor,
  VOTE_POINTS,
  WIN_POINTS,
} from "./rules";
import {
  type LineupMatch,
  type LuDeck,
  type LuOffer,
  type LuRound,
  REACTIONS,
} from "./types";

/** The most cards one side of a trade can carry. */
const TRADE_MAX = 9;

const match = (s: RoomState): LineupMatch => s.lu ?? fail("wrong_phase");
export const roundOf = (lu: LineupMatch): LuRound =>
  lu.rounds.at(-1) ?? fail("wrong_phase");
const deckOf = (lu: LineupMatch): LuDeck =>
  lu.decks[lu.round - 1] ?? fail("wrong_phase");

/** Dealt in and still here: they bid, trade, defend and vote. */
export function inPlay(s: RoomState): PlayerId[] {
  const lu = s.lu;
  if (!lu) return [];
  return lu.dealt.filter((id) => {
    const p = findPlayer(s, id);
    return !!p && isPresent(p);
  });
}

function requirePlaying(s: RoomState, id: PlayerId) {
  requireSeated(s, id);
  if (!inPlay(s).includes(id)) fail("not_your_turn");
}

/** The highest offer on the open lot, and who made it. */
export function leaderOf(lu: LineupMatch): {
  id: PlayerId | null;
  price: number;
} {
  let id: PlayerId | null = null;
  let price = 0;
  for (const [by, amount] of Object.entries(lu.bids))
    if (amount > price) {
      id = by;
      price = amount;
    }
  return { id, price };
}

/** Can still top the open lot: in play, not passed, with more coins than the price. */
function canTop(s: RoomState, id: PlayerId) {
  const lu = match(s);
  return (lu.coins[id] ?? 0) > leaderOf(lu).price && !lu.passed.includes(id);
}

/** Every one but the leader passed or can't top it: the hammer falls. */
function settled(s: RoomState) {
  const { id: leader } = leaderOf(match(s));
  return inPlay(s).every((id) => id === leader || !canTop(s, id));
}

// --- the match ---------------------------------------------------------------

/**
 * The match starts: everyone here is dealt in, the opening plays (the rules
 * on a first match, then the envelope that holds the mission), and the first
 * lot comes onto the table.
 */
export function beginLineup(s: RoomState, decks: LuDeck[], ctx: Ctx) {
  const dealt = s.players.filter(isPresent).map((p) => p.id);
  const lots = lotsFor(dealt.length, s.settings.lotsPerSeat);
  if (
    decks.length !== roundsFor(dealt.length, s.settings.rounds) ||
    decks.some((d) => d.lots !== lots || d.cards.length < lots)
  )
    fail("invalid_input");
  s.round += 1;
  s.theme = null;
  s.vote = null;
  s.ideas = [];
  s.plays = [];
  s.assignments = {};
  s.outcomes = {};
  s.turnPlayerId = null;
  s.order = dealt;
  for (const p of s.players) {
    p.strikes = 0;
    p.away = false;
  }
  s.lu = {
    dealt,
    decks: structuredClone(decks),
    round: 0,
    rounds: [],
    coins: {},
    lot: -1,
    bids: {},
    passed: [],
    breaks: [],
    offers: [],
    done: [],
    cuts: {},
    showing: 0,
  };
  const first = longShows(s, s.round);
  const L = SHOW_TIMING.lineup;
  startRound(s, ctx, [
    ["curtain", SHOW_TIMING.curtain],
    first ? ["rules", L.rules] : ["round", SHOW_TIMING.round],
    ["secret", first ? L.secret.first : L.secret.later],
    ["entrance", L.entrance],
  ]);
  // the first bid can come once the opening is over
  s.playStartedAt = s.reveal?.until ?? ctx.now;
}

/** New coins, a new deck: the opening (`parts`) plays, then the first lot. */
function startRound(s: RoomState, ctx: Ctx, parts: Part[]) {
  const lu = match(s);
  lu.round += 1;
  const deck = deckOf(lu);
  lu.rounds.push({
    n: lu.round,
    hands: Object.fromEntries(lu.dealt.map((id) => [id, []])),
    tags: {},
    leftovers: [],
    change: {},
    trades: [],
    boards: {},
    order: [],
    reactions: {},
    votes: {},
    tie: null,
    winners: [],
    crowd: null,
    points: {},
    rated: {},
  });
  lu.coins = Object.fromEntries(lu.dealt.map((id) => [id, s.settings.coins]));
  lu.breaks = breaksFor(deck.lots, s.settings.interval);
  lu.offers = [];
  const first = lu.round === 1 && longShows(s, s.round);
  stage(s, "opening", lu.round, first, parts, ctx);
  openLot(s, ctx, 0);
}

// --- the auction ---------------------------------------------------------------

/** Lot `i` on the table; with nobody left to bid, the rest go to the leftovers. */
function openLot(s: RoomState, ctx: Ctx, i: number) {
  const lu = match(s);
  const deck = deckOf(lu);
  lu.lot = i;
  lu.bids = {};
  lu.passed = [];
  lu.done = [];
  lu.cuts = {};
  const bidders = inPlay(s).filter((id) => (lu.coins[id] ?? 0) > 0);
  if (!bidders.length) {
    const round = roundOf(lu);
    for (let j = i; j < deck.lots; j++) round.leftovers.push(j);
    lu.lot = deck.lots - 1;
    return endAuction(s, ctx);
  }
  s.phase = "bidding";
  startStep(
    s,
    ctx,
    bidders.length === 1 ? LU_CLOCKS.lone : stepMs(s, "lotSeconds"),
  );
}

/**
 * An offer on the open lot. It carries the amount, never "+1": of two that
 * arrive together, the first wins and the second no longer tops it ("outbid").
 * A bid in the lot's last seconds gives them back.
 */
export function bid(
  s: RoomState,
  playerId: PlayerId,
  amount: number,
  ctx: Ctx,
) {
  if (s.phase !== "bidding") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  if (!Number.isInteger(amount) || amount < 1) fail("invalid_input");
  const lead = leaderOf(lu);
  if (lead.id === playerId) fail("already_done");
  if (amount <= lead.price) fail("outbid");
  if (amount > (lu.coins[playerId] ?? 0)) fail("invalid_input");
  lu.bids[playerId] = amount;
  lu.passed = lu.passed.filter((id) => id !== playerId);
  if (settled(s)) return closeLot(s, ctx);
  if (s.deadline !== null && s.deadline - ctx.now < LU_CLOCKS.snipe)
    s.deadline = ctx.now + LU_CLOCKS.snipe;
}

/** Out of this lot ("Pass"); a bid takes them back in while it is open. */
export function fold(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "bidding") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  if (leaderOf(lu).id === playerId) fail("invalid_input");
  if (!lu.passed.includes(playerId)) lu.passed.push(playerId);
  if (settled(s)) closeLot(s, ctx);
}

/** The hammer: the leader pays and takes it, or it goes to the leftovers. Then a break, the next lot or the end. */
function closeLot(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  const i = lu.lot;
  const lead = leaderOf(lu);
  if (lead.id) {
    lu.coins[lead.id] -= lead.price;
    round.hands[lead.id].push(i);
    round.tags[i] = { by: lead.id, price: lead.price };
  } else round.leftovers.push(i);
  const L = SHOW_TIMING.lineup;
  stage(s, "sold", i, false, [["sold", lead.id ? L.sold : L.unsold]], ctx);
  if (i + 1 >= deckOf(lu).lots) return endAuction(s, ctx);
  if (lu.breaks.includes(i)) return beginBreak(s, ctx);
  openLot(s, ctx, i + 1);
}

/** The auction stops: every board and the coins left, for a while. */
function beginBreak(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  lu.done = [];
  lu.cuts = {};
  s.phase = "halftime";
  startStep(s, ctx, LU_CLOCKS.halftime);
}

/**
 * The last lot is gone: a team left empty gets a leftover (drawn) or a
 * spare, the boards show side by side, then the trades or the envelope.
 */
function endAuction(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  const deck = deckOf(lu);
  const held = new Set(Object.values(round.hands).flat());
  const spares = deck.cards
    .map((_, i) => i)
    .filter((i) => i >= deck.lots && !held.has(i));
  for (const id of lu.dealt) {
    if (round.hands[id].length) continue;
    const k = Math.floor(ctx.random() * round.leftovers.length);
    const card = round.leftovers.length
      ? round.leftovers.splice(k, 1)[0]
      : spares.shift();
    if (card === undefined) continue;
    round.hands[id].push(card);
    round.tags[card] = { by: null, price: 0 };
  }
  round.change = { ...lu.coins };
  lu.bids = {};
  lu.passed = [];
  const wrap: Part = ["wrap", SHOW_TIMING.lineup.wrap];
  if (s.settings.trades && inPlay(s).length >= 2) {
    stage(s, "wrap", lu.round, false, [wrap], ctx);
    return beginTrades(s, ctx);
  }
  // no trades: the envelope opens right after, in the same show
  beginDefense(s, ctx, [wrap]);
}

// --- trades -----------------------------------------------------------------

function beginTrades(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  lu.offers = [];
  lu.done = [];
  lu.cuts = {};
  s.phase = "trading";
  startStep(s, ctx, stepMs(s, "tradeSeconds"));
}

const owns = (round: LuRound, id: PlayerId, cards: number[]) =>
  cards.every((c) => round.hands[id]?.includes(c));

const cardList = (cards: unknown) =>
  Array.isArray(cards) &&
  cards.length >= 1 &&
  cards.length <= TRADE_MAX &&
  cards.every(Number.isInteger) &&
  new Set(cards).size === cards.length;

/** An open offer to `to`: some of my cards for some of theirs. It replaces my last one. */
export function offer(
  s: RoomState,
  playerId: PlayerId,
  o: Omit<LuOffer, "from">,
  ctx: Ctx,
) {
  if (s.phase !== "trading") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  const round = roundOf(lu);
  if (o.to === playerId || !inPlay(s).includes(o.to)) fail("invalid_input");
  if (!cardList(o.give) || !cardList(o.get)) fail("invalid_input");
  if (!owns(round, playerId, o.give) || !owns(round, o.to, o.get))
    fail("invalid_input");
  lu.offers = lu.offers.filter((x) => x.from !== playerId);
  lu.offers.push({
    from: playerId,
    to: o.to,
    give: [...o.give],
    get: [...o.get],
  });
  // whoever makes an offer is not done trading
  undo(s, playerId);
}

/** Takes my open offer back. */
export function cancelOffer(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "trading") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  lu.offers = lu.offers.filter((x) => x.from !== playerId);
  if (tradesOver(s)) closeTrades(s, ctx);
}

/** Yes or no to an offer made to me; yes swaps the cards at once, tags and all. */
export function answerOffer(
  s: RoomState,
  playerId: PlayerId,
  from: PlayerId,
  accept: boolean,
  ctx: Ctx,
) {
  if (s.phase !== "trading") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  const round = roundOf(lu);
  const o =
    lu.offers.find((x) => x.from === from && x.to === playerId) ??
    fail("already_done");
  lu.offers = lu.offers.filter((x) => x !== o);
  if (accept) {
    if (!owns(round, o.from, o.give) || !owns(round, o.to, o.get))
      fail("already_done");
    const without = (hand: number[], cards: number[]) =>
      hand.filter((c) => !cards.includes(c));
    round.hands[o.from] = [...without(round.hands[o.from], o.give), ...o.get];
    round.hands[o.to] = [...without(round.hands[o.to], o.get), ...o.give];
    round.trades.push({ ...o, at: ctx.now });
    // offers that counted on a card that moved are gone
    lu.offers = lu.offers.filter(
      (x) => owns(round, x.from, x.give) && owns(round, x.to, x.get),
    );
  }
  if (tradesOver(s)) closeTrades(s, ctx);
}

const tradesOver = (s: RoomState) =>
  match(s).offers.length === 0 && everyoneDone(s);

/** Trades are over (open offers lapse): the envelope. */
function closeTrades(s: RoomState, ctx: Ctx) {
  match(s).offers = [];
  beginDefense(s, ctx);
}

// --- the envelope and the boards ---------------------------------------------

/** The envelope opens (after `before`); then everyone lays out their board to defend the team. */
function beginDefense(s: RoomState, ctx: Ctx, before: Part[] = []) {
  const lu = match(s);
  lu.done = [];
  lu.cuts = {};
  stage(
    s,
    "envelope",
    lu.round,
    false,
    [...before, ["envelope", SHOW_TIMING.lineup.envelope]],
    ctx,
  );
  s.phase = "defending";
  startStep(s, ctx, stepMs(s, "defendSeconds"));
}

/** The board as its owner has it now; written quietly, it stands as it is when the clock ends. */
export function saveBoard(
  s: RoomState,
  playerId: PlayerId,
  raw: unknown,
  ctx: Ctx,
) {
  if (s.phase !== "defending") fail("wrong_phase");
  if (s.deadline !== null && ctx.now >= s.deadline) fail("wrong_phase");
  requirePlaying(s, playerId);
  const round = roundOf(match(s));
  const board =
    cleanBoard(raw, round.hands[playerId] ?? []) ?? fail("invalid_input");
  round.boards[playerId] = board;
}

// --- the stage ---------------------------------------------------------------

/** The boards go on stage one by one, in a drawn order. */
function beginStage(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  round.order = shuffle(
    lu.dealt.filter((id) => round.hands[id]?.length),
    ctx.random,
  );
  lu.done = [];
  lu.cuts = {};
  s.phase = "presenting";
  showBoard(s, ctx, 0);
}

/** Board `i` on stage, skipping owners who left; after the last, the vote. */
function showBoard(s: RoomState, ctx: Ctx, i: number) {
  const lu = match(s);
  const round = roundOf(lu);
  const here = inPlay(s);
  let k = i;
  while (k < round.order.length && !here.includes(round.order[k])) k += 1;
  if (k >= round.order.length) return beginJudging(s, ctx);
  lu.showing = k;
  startStep(s, ctx, LU_CLOCKS.present);
}

/** The owner on stage is done talking. */
export function presented(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "presenting") fail("wrong_phase");
  guardStep(s, ctx);
  requireSeated(s, playerId);
  const lu = match(s);
  if (roundOf(lu).order[lu.showing] !== playerId) fail("not_your_turn");
  showBoard(s, ctx, lu.showing + 1);
}

/**
 * Reactions to the board on stage, sent in small batches (counts per
 * REACTIONS emoji). Each player gets REACT_MAX per board; the owner none.
 */
export function react(
  s: RoomState,
  playerId: PlayerId,
  counts: number[],
  ctx: Ctx,
) {
  if (s.phase !== "presenting") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  const round = roundOf(lu);
  const owner = round.order[lu.showing];
  if (owner === playerId) fail("invalid_input");
  if (
    !Array.isArray(counts) ||
    counts.length !== REACTIONS.length ||
    !counts.every((n) => Number.isInteger(n) && n >= 0 && n <= REACT_MAX)
  )
    fail("invalid_input");
  round.reactions[owner] ??= {};
  const board = round.reactions[owner];
  board[playerId] ??= REACTIONS.map(() => 0);
  const mine = board[playerId];
  let room = REACT_MAX - mine.reduce((a, b) => a + b, 0);
  counts.forEach((n, k) => {
    const take = Math.min(n, room);
    mine[k] += take;
    room -= take;
  });
}

// --- the vote ----------------------------------------------------------------

function beginJudging(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  roundOf(lu).votes = {};
  lu.done = [];
  lu.cuts = {};
  s.phase = "judging";
  startStep(s, ctx, stepMs(s, "judgeSeconds"));
}

/** Boards one can vote for: every team with a card. */
const candidates = (lu: LineupMatch) =>
  lu.dealt.filter((id) => roundOf(lu).hands[id]?.length);

/** A secret vote for a board, one's own included; again to change it (that cuts nothing). */
export function judge(
  s: RoomState,
  playerId: PlayerId,
  ownerId: PlayerId,
  ctx: Ctx,
) {
  const lu = match(s);
  const round = roundOf(lu);
  if (s.phase === "tiebreak") {
    guardStep(s, ctx);
    requirePlaying(s, playerId);
    const tie = round.tie ?? fail("wrong_phase");
    if (!tie.voters.includes(playerId)) fail("not_your_turn");
    if (!tie.among.includes(ownerId)) fail("invalid_input");
    tie.votes[playerId] = ownerId;
    if (
      tie.voters.every(
        (id) => tie.votes[id] !== undefined || !inPlay(s).includes(id),
      )
    )
      settleTie(s, ctx);
    return;
  }
  if (s.phase !== "judging") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  if (!candidates(lu).includes(ownerId)) fail("invalid_input");
  const first = round.votes[playerId] === undefined;
  round.votes[playerId] = ownerId;
  if (inPlay(s).every((id) => round.votes[id] !== undefined))
    return tally(s, ctx);
  if (first) cut(s, ctx, playerId, LU_FLOORS.judging);
}

/** Votes for each board. */
function counts(votes: Record<PlayerId, PlayerId>) {
  const n = new Map<PlayerId, number>();
  for (const owner of Object.values(votes))
    n.set(owner, (n.get(owner) ?? 0) + 1);
  return n;
}

/** The votes fall; a tie at the top goes to those who voted outside it, if anyone did. */
function tally(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  const n = counts(round.votes);
  const most = Math.max(0, ...n.values());
  const top = most
    ? [...n].filter(([, v]) => v === most).map(([id]) => id)
    : [];
  stage(
    s,
    "tally",
    lu.round,
    false,
    [
      ["votes", votesMs(Object.keys(round.votes).length)],
      ["stamp", SHOW_TIMING.lineup.stamp],
    ],
    ctx,
  );
  const outside = inPlay(s).filter(
    (id) => round.votes[id] !== undefined && !top.includes(round.votes[id]),
  );
  if (top.length > 1 && outside.length) {
    round.tie = { among: top, voters: outside, votes: {} };
    s.phase = "tiebreak";
    startStep(s, ctx, LU_CLOCKS.tiebreak);
    return;
  }
  round.winners = top;
  scoreRound(s, ctx);
}

/** The tiebreak's votes join the first ones; still tied, they win together. */
function settleTie(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  const tie = round.tie ?? fail("wrong_phase");
  const n = counts(round.votes);
  for (const [k, v] of counts(tie.votes)) n.set(k, (n.get(k) ?? 0) + v);
  const most = Math.max(...tie.among.map((id) => n.get(id) ?? 0));
  round.winners = tie.among.filter((id) => (n.get(id) ?? 0) === most);
  stage(
    s,
    "tally",
    lu.round,
    false,
    [
      ["votes", votesMs(Object.keys(tie.votes).length)],
      ["stamp", SHOW_TIMING.lineup.stamp],
    ],
    ctx,
  );
  scoreRound(s, ctx);
}

/** Points: one per vote the board got, more for the winners; the crowd's prize; then the score. */
function scoreRound(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  const round = roundOf(lu);
  const n = counts(round.votes);
  round.points = Object.fromEntries(
    lu.dealt.map((id) => [
      id,
      (n.get(id) ?? 0) * VOTE_POINTS +
        (round.winners.includes(id) ? WIN_POINTS : 0),
    ]),
  );
  const laughs = lu.dealt.map((id) => [id, reactionsOn(round, id)] as const);
  const most = Math.max(0, ...laughs.map(([, v]) => v));
  const top = laughs.filter(([, v]) => v === most);
  round.crowd = most >= CROWD_MIN && top.length === 1 ? top[0][0] : null;
  lu.done = [];
  lu.cuts = {};
  s.phase = "scoring";
  startStep(s, ctx, LU_CLOCKS.score);
}

/** Every reaction a board got. */
export const reactionsOn = (round: LuRound, owner: PlayerId) =>
  Object.values(round.reactions[owner] ?? {})
    .flat()
    .reduce((a, b) => a + b, 0);

/** "Good mission?" from the score: up, down, or taken back. */
export function rate(s: RoomState, playerId: PlayerId, up: boolean | null) {
  if (s.phase !== "scoring") fail("wrong_phase");
  requirePlaying(s, playerId);
  const round = roundOf(match(s));
  if (up === null) delete round.rated[playerId];
  else round.rated[playerId] = up ? 1 : -1;
}

/** The next round's coins and lots, or the podium. */
function nextRound(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  if (lu.round >= lu.decks.length || inPlay(s).length < 2)
    return finish(s, ctx);
  const L = SHOW_TIMING.lineup;
  startRound(s, ctx, [
    ["round", SHOW_TIMING.round],
    ["secret", L.secret.later],
    ["entrance", L.entrance],
  ]);
}

// --- done, the cuts and the clock ----------------------------------------------

/** One of the people in this step is done: the clock loses its share, never below `floor`. */
function cut(s: RoomState, ctx: Ctx, playerId: PlayerId, floor: number) {
  const lu = match(s);
  const people = inPlay(s).length;
  if (s.deadline === null || s.stepMs === null || people < 1) return;
  const before = s.deadline;
  const share = Math.round(s.stepMs / people);
  s.deadline = Math.min(
    s.deadline,
    Math.max(s.deadline - share, ctx.now + floor),
  );
  lu.cuts[playerId] = before - s.deadline;
}

/** Not done after all: the time they cut comes back. */
function undo(s: RoomState, playerId: PlayerId) {
  const lu = match(s);
  if (!lu.done.includes(playerId)) return;
  lu.done = lu.done.filter((id) => id !== playerId);
  if (s.deadline !== null) s.deadline += lu.cuts[playerId] ?? 0;
  delete lu.cuts[playerId];
}

const everyoneDone = (s: RoomState) =>
  inPlay(s).every((id) => match(s).done.includes(id));

const DONE_FLOORS: Partial<Record<RoomState["phase"], number>> = {
  halftime: LU_FLOORS.halftime,
  trading: LU_FLOORS.trading,
  defending: LU_FLOORS.defending,
  scoring: LU_FLOORS.scoring,
};

/** "Continue", "Done", "Next round": cuts the clock; everyone done ends the step. Taken back, the time returns. */
export function markDone(
  s: RoomState,
  playerId: PlayerId,
  done: boolean,
  ctx: Ctx,
) {
  const floor = DONE_FLOORS[s.phase] ?? fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const lu = match(s);
  if (!done) return undo(s, playerId);
  if (lu.done.includes(playerId)) return;
  lu.done.push(playerId);
  if (s.phase === "trading" ? tradesOver(s) : everyoneDone(s))
    return advance(s, ctx);
  cut(s, ctx, playerId, floor);
}

/** The step is over, by the clock or because everyone is done. */
function advance(s: RoomState, ctx: Ctx) {
  const lu = match(s);
  switch (s.phase) {
    case "bidding":
      return closeLot(s, ctx);
    case "halftime":
      return openLot(s, ctx, lu.lot + 1);
    case "trading":
      return closeTrades(s, ctx);
    case "defending":
      return beginStage(s, ctx);
    case "presenting":
      return showBoard(s, ctx, lu.showing + 1);
    case "judging":
      return tally(s, ctx);
    case "tiebreak":
      return settleTie(s, ctx);
    case "scoring":
      return nextRound(s, ctx);
    default:
      return fail("wrong_phase");
  }
}

/** The clock ran out: whatever stands, stands. */
export const luTimeout = (s: RoomState, ctx: Ctx) => advance(s, ctx);

/**
 * A player left the match: their cards and board stay, their bid on the
 * table too; the step goes on without them, and ends if it was only
 * waiting on them. Fewer than two left: the podium.
 */
export function luLeft(s: RoomState, id: PlayerId, ctx: Ctx) {
  const lu = s.lu;
  if (!lu?.dealt.includes(id)) return;
  if (inPlay(s).length < 2) return finish(s, ctx);
  lu.offers = lu.offers.filter((o) => o.from !== id && o.to !== id);
  const round = roundOf(lu);
  switch (s.phase) {
    case "bidding":
      if (settled(s)) closeLot(s, ctx);
      return;
    case "halftime":
    case "defending":
    case "scoring":
      if (everyoneDone(s)) advance(s, ctx);
      return;
    case "trading":
      if (tradesOver(s)) advance(s, ctx);
      return;
    case "presenting":
      if (round.order[lu.showing] === id) showBoard(s, ctx, lu.showing + 1);
      return;
    case "judging":
      if (inPlay(s).every((p) => round.votes[p] !== undefined)) tally(s, ctx);
      return;
    case "tiebreak": {
      const tie = round.tie;
      if (
        tie?.voters.every(
          (p) => tie.votes[p] !== undefined || !inPlay(s).includes(p),
        )
      )
        settleTie(s, ctx);
      return;
    }
  }
}

/** The board each player shows this round: their layout over the grid. */
export const boardsOf = (round: LuRound) =>
  Object.fromEntries(
    Object.entries(round.hands).map(([id, hand]) => [
      id,
      boardOf(round.boards[id], hand),
    ]),
  );
