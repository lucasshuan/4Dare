// The Impostor's rules, on the room's shared state. Pure like the engine: the
// server supplies the cards and the questions (ImpDeal), the clock is ctx.now.
import { findPlayer, isPresent } from "../helpers";
import { isCloseMatch } from "../match";
import {
  cleanText,
  cutClock,
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
import {
  type Character,
  type Ctx,
  MAX_GUESS,
  type PlayerId,
  type RoomState,
  SHOW_TIMING,
  TALK_FLOOR_MS,
  type Theme,
} from "../types";
import { givesAway, validAnswer } from "./answers";
import { RECENT_QUESTIONS } from "./questions";
import type {
  ImpAnswer,
  ImpAsked,
  ImpDeal,
  ImpostorMatch,
  ImpQuestion,
  ImpWinner,
} from "./types";

/** How long the answers, a vote's result and a card swap stay on screen (ms, before scaling). */
export const IMP_REVEAL = {
  repliesBase: 4200,
  perReply: 350,
  perWord: 450,
  repliesMax: 9500,
  out: 5200,
  /** The vote tied, or nobody voted: nobody goes. */
  tie: 3400,
  /** An impostor caught: the card flips. */
  caught: 6200,
  swap: 3200,
} as const;

/** Questions before the first vote; one before each later vote. */
export const FIRST_ROUND_QUESTIONS = 2;
/** "I don't know this one" swaps the cards at most this many times a match. */
export const MAX_SWAPS = 2;

/**
 * How many get the impostor card: one, two from seven players, or the host's
 * number; never more than a third of the table, never none.
 */
export function impostorsFor(players: number, setting: number | null) {
  const most = Math.max(1, Math.floor(players / 3));
  const auto = players >= 7 ? 2 : 1;
  return Math.min(most, Math.max(1, setting ?? auto));
}

/** Vote rounds before the impostors win anyway (ties send nobody out). */
export const maxRounds = (dealt: number) => dealt;

const match = (s: RoomState): ImpostorMatch => s.imp ?? fail("wrong_phase");

/** Still in the match: dealt in, not out, page not gone for good. */
export function playing(s: RoomState): PlayerId[] {
  const imp = s.imp;
  if (!imp) return [];
  return imp.dealt.filter((id) => {
    const p = findPlayer(s, id);
    return p && isPresent(p) && !imp.outs.some((o) => o.id === id);
  });
}

const requirePlaying = (s: RoomState, id: PlayerId) => {
  requireSeated(s, id);
  if (!playing(s).includes(id)) fail("not_your_turn");
};

/** The card a player holds. */
export const cardOf = (imp: ImpostorMatch, id: PlayerId): Character =>
  imp.impostors.includes(id) ? imp.impostor : imp.crew;

const openAsked = (imp: ImpostorMatch): ImpAsked | null => {
  const last = imp.asked.at(-1);
  return last && !last.revealed ? last : null;
};

/**
 * The vote is over and the cards are dealt: the deal show (the vote's result,
 * the theme, "your card"), then the first question.
 */
export function beginImpostor(
  s: RoomState,
  theme: Theme,
  deal: ImpDeal,
  tie: boolean,
  ctx: Ctx,
) {
  s.round += 1;
  s.theme = theme;
  s.ideas = [];
  s.plays = [];
  s.assignments = {};
  s.outcomes = {};
  s.turnPlayerId = null;
  const dealt = s.players.filter(isPresent).map((p) => p.id);
  s.order = dealt;
  for (const p of s.players) {
    p.strikes = 0;
    p.away = false;
  }
  const count = impostorsFor(dealt.length, s.settings.impostors);
  s.imp = {
    crew: structuredClone(deal.crew),
    impostor: structuredClone(deal.impostor),
    spares: structuredClone(deal.spares),
    queue: structuredClone(deal.questions),
    dealt,
    impostors: shuffle(dealt, ctx.random).slice(0, count),
    asked: [],
    vote: null,
    outs: [],
    round: 1,
    swaps: 0,
    guessing: null,
    winner: null,
    reason: null,
  };
  const first = longShows(s, s.round);
  const v = first ? "first" : "later";
  const T = SHOW_TIMING;
  const parts: Part[] = [
    ["tie_spin", tie ? T.tieSpin : 0],
    ["settle", T.settle[v]],
    ["theme", T.theme.alone],
    ["card", T.card[v]],
    ["entrance", T.entrance.reply],
  ];
  // The first answer can come once the cards are in.
  s.playStartedAt = stage(s, "deal", s.round, first, parts, ctx);
  ask(s, ctx);
}

/** The next question from the queue; when it runs out, the ones asked come back in order. */
function nextQuestion(imp: ImpostorMatch): ImpQuestion {
  if (!imp.queue.length)
    imp.queue = [
      ...new Map(imp.asked.map((a) => [a.question.id, a.question])).values(),
    ];
  return imp.queue.shift() ?? fail("invalid_input");
}

/** Puts a question to everyone still in. */
function ask(s: RoomState, ctx: Ctx) {
  const imp = match(s);
  imp.asked.push({
    round: imp.round,
    question: nextQuestion(imp),
    answers: {},
    cuts: {},
    revealed: false,
  });
  imp.vote = null;
  s.phase = "replying";
  startStep(s, ctx, stepMs(s, "replySeconds"));
}

const everyoneAnswered = (s: RoomState, q: ImpAsked) =>
  playing(s).every((id) => q.answers[id] !== undefined);

/** An answer to the open question, or a new one in its place (that cuts nothing). */
export function reply(
  s: RoomState,
  playerId: PlayerId,
  answer: ImpAnswer,
  ctx: Ctx,
) {
  if (s.phase !== "replying") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const imp = match(s);
  const q = openAsked(imp) ?? fail("wrong_phase");
  const a = validAnswer(q.question, answer) ?? fail("invalid_input");
  if ("word" in a && givesAway(a.word, cardOf(imp, playerId)))
    fail("gives_away");
  const first = q.answers[playerId] === undefined;
  q.answers[playerId] = a;
  if (everyoneAnswered(s, q)) return revealReplies(s, ctx);
  if (!first) return;
  const before = s.deadline;
  cutClock(s, ctx, "replySeconds", playing(s).length);
  if (before !== null && s.deadline !== null)
    q.cuts[playerId] = before - s.deadline;
}

/** Takes the answer back to change it: the time it cut comes back. */
export function unreply(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "replying") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const q = openAsked(match(s)) ?? fail("wrong_phase");
  if (q.answers[playerId] === undefined) return;
  delete q.answers[playerId];
  const back = q.cuts[playerId] ?? 0;
  delete q.cuts[playerId];
  if (s.deadline !== null) s.deadline += back;
}

function repliesMs(q: ImpAsked, scale: number) {
  const t = IMP_REVEAL;
  const n = Object.keys(q.answers).length;
  const per = q.question.kind === "word" ? t.perWord : t.perReply;
  return Math.round(Math.min(t.repliesMax, t.repliesBase + per * n) * scale);
}

const scaleOf = (ctx: Ctx) =>
  ctx.showScale && ctx.showScale > 0 ? ctx.showScale : 1;

/** The answers land together; then another question (the first round has two) or the talk. */
function revealReplies(s: RoomState, ctx: Ctx) {
  const imp = match(s);
  const q = openAsked(imp) ?? fail("wrong_phase");
  q.revealed = true;
  s.reveal = {
    kind: "replies",
    n: imp.asked.length - 1,
    startsAt: ctx.now,
    until: ctx.now + repliesMs(q, scaleOf(ctx)),
  };
  const thisRound = imp.asked.filter((a) => a.round === imp.round).length;
  if (imp.round === 1 && thisRound < FIRST_ROUND_QUESTIONS) return ask(s, ctx);
  imp.vote = { round: imp.round, points: {}, votes: {}, cuts: {} };
  s.phase = "talking";
  startStep(s, ctx, stepMs(s, "talkSeconds"));
}

/** Points at someone (or at nobody): free, everyone sees it, it counts for nothing. */
export function point(
  s: RoomState,
  playerId: PlayerId,
  targetId: PlayerId | null,
) {
  if (s.phase !== "talking") fail("wrong_phase");
  requirePlaying(s, playerId);
  const v = match(s).vote ?? fail("wrong_phase");
  if (targetId === null) {
    delete v.points[playerId];
    return;
  }
  if (targetId === playerId || !playing(s).includes(targetId))
    fail("invalid_input");
  v.points[playerId] = targetId;
}

const everyoneVoted = (s: RoomState) => {
  const v = s.imp?.vote;
  return !!v && playing(s).every((id) => v.votes[id] !== undefined);
};

/** A vote to send `targetId` out. The first one a player confirms cuts the talk, never below TALK_FLOOR_MS. */
export function accuse(
  s: RoomState,
  playerId: PlayerId,
  targetId: PlayerId,
  ctx: Ctx,
) {
  if (s.phase !== "talking") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const v = match(s).vote ?? fail("wrong_phase");
  if (targetId === playerId || !playing(s).includes(targetId))
    fail("invalid_input");
  const first = v.votes[playerId] === undefined;
  v.votes[playerId] = targetId;
  v.points[playerId] = targetId;
  if (everyoneVoted(s)) return resolveVote(s, ctx);
  if (!first) return;
  const before = s.deadline;
  cutClock(s, ctx, "talkSeconds", playing(s).length, TALK_FLOOR_MS);
  if (before !== null && s.deadline !== null)
    v.cuts[playerId] = before - s.deadline;
}

/** Takes a confirmed vote back (the pointing stays): the time it cut comes back. */
export function unaccuse(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "talking") fail("wrong_phase");
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const v = match(s).vote ?? fail("wrong_phase");
  if (v.votes[playerId] === undefined) return;
  delete v.votes[playerId];
  const back = v.cuts[playerId] ?? 0;
  delete v.cuts[playerId];
  if (s.deadline !== null) s.deadline += back;
}

/**
 * The most confirmed votes sends that player out; a tie, or nobody voting,
 * sends nobody. A caught impostor gets their last chance first.
 */
function resolveVote(s: RoomState, ctx: Ctx) {
  const imp = match(s);
  const v = imp.vote ?? fail("wrong_phase");
  const counts = new Map<PlayerId, number>();
  const still = playing(s);
  for (const [by, target] of Object.entries(v.votes))
    if (still.includes(by) && still.includes(target))
      counts.set(target, (counts.get(target) ?? 0) + 1);
  const most = Math.max(0, ...counts.values());
  const top = [...counts].filter(([, n]) => n === most).map(([id]) => id);
  const scale = scaleOf(ctx);
  if (most === 0 || top.length !== 1) {
    s.reveal = {
      kind: "out",
      n: imp.round,
      startsAt: ctx.now,
      until: ctx.now + Math.round(IMP_REVEAL.tie * scale),
    };
    return nextRound(s, ctx);
  }
  const out = top[0];
  const impostor = imp.impostors.includes(out);
  imp.outs.push({
    id: out,
    round: imp.round,
    impostor,
    left: false,
    by: Object.entries(v.votes)
      .filter(([, target]) => target === out)
      .map(([by]) => by),
    guess: null,
    hit: null,
  });
  s.reveal = {
    kind: "out",
    n: imp.round,
    startsAt: ctx.now,
    until:
      ctx.now +
      Math.round((impostor ? IMP_REVEAL.caught : IMP_REVEAL.out) * scale),
  };
  if (!impostor) return nextRound(s, ctx);
  imp.guessing = out;
  s.phase = "last_chance";
  startStep(s, ctx, stepMs(s, "lastSeconds"));
}

/** A caught impostor's guess at the crew's card; it stays secret until the end. */
export function lastGuess(
  s: RoomState,
  playerId: PlayerId,
  text: string,
  ctx: Ctx,
) {
  if (s.phase !== "last_chance") fail("wrong_phase");
  guardStep(s, ctx);
  requireSeated(s, playerId);
  const imp = match(s);
  if (playerId !== imp.guessing) fail("not_your_turn");
  const guess = cleanText(text.replace(/\s+/g, " "), MAX_GUESS);
  settleGuess(imp, guess);
  nextRound(s, ctx);
}

function settleGuess(imp: ImpostorMatch, guess: string | null) {
  const out = imp.outs.find((o) => o.id === imp.guessing);
  if (out) {
    out.guess = guess;
    out.hit =
      guess !== null &&
      isCloseMatch(guess, [imp.crew.name, ...imp.crew.aliases]);
  }
  imp.guessing = null;
}

/** Who wins now, if anyone: no impostor left, or as many impostors as the rest, or no rounds left. */
function verdict(
  s: RoomState,
): { winner: ImpWinner; reason: NonNullable<ImpostorMatch["reason"]> } | null {
  const imp = match(s);
  const still = playing(s);
  const impostors = still.filter((id) => imp.impostors.includes(id)).length;
  if (impostors === 0)
    return {
      winner: "crew",
      reason: imp.outs.some((o) => o.impostor && !o.left) ? "caught" : "left",
    };
  if (impostors >= still.length - impostors)
    return { winner: "impostors", reason: "even" };
  if (imp.round >= maxRounds(imp.dealt.length))
    return { winner: "impostors", reason: "rounds" };
  return null;
}

function end(
  s: RoomState,
  v: NonNullable<ReturnType<typeof verdict>>,
  ctx: Ctx,
) {
  const imp = match(s);
  imp.winner = v.winner;
  imp.reason = v.reason;
  imp.vote = null;
  imp.guessing = null;
  const asked = imp.asked.map((a) => a.question.id).reverse();
  s.recentQuestions = [
    ...new Set([...asked, ...(s.recentQuestions ?? [])]),
  ].slice(0, RECENT_QUESTIONS);
  finish(s, ctx);
}

/** After a vote (and a last chance): the match ends, or the next round's question comes. */
function nextRound(s: RoomState, ctx: Ctx) {
  const v = verdict(s);
  if (v) return end(s, v, ctx);
  const imp = match(s);
  imp.round += 1;
  ask(s, ctx);
}

/**
 * Someone didn't know their card: everyone gets the next spare pair (the
 * impostors stay who they were), the open question starts again, and nobody
 * is told who asked. Only before the first answers are shown.
 */
export function dontKnow(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "replying") fail("wrong_phase");
  // after the deal show: the new cards must not cut it short
  guardStep(s, ctx);
  requirePlaying(s, playerId);
  const imp = match(s);
  if (imp.asked.some((a) => a.revealed)) fail("wrong_phase");
  if (imp.swaps >= MAX_SWAPS) fail("already_done");
  const pair = imp.spares.shift() ?? fail("already_done");
  imp.crew = pair.crew;
  imp.impostor = pair.impostor;
  imp.swaps += 1;
  const q = openAsked(imp) ?? fail("wrong_phase");
  q.answers = {};
  q.cuts = {};
  s.reveal = {
    kind: "swap",
    n: imp.swaps,
    startsAt: ctx.now,
    until: ctx.now + Math.round(IMP_REVEAL.swap * scaleOf(ctx)),
  };
  startStep(s, ctx, stepMs(s, "replySeconds"));
}

/** The clock ran out: unanswered stays unanswered, unconfirmed votes don't count, no guess misses. */
export function impTimeout(s: RoomState, ctx: Ctx) {
  switch (s.phase) {
    case "replying":
      return revealReplies(s, ctx);
    case "talking":
      return resolveVote(s, ctx);
    case "last_chance":
      settleGuess(match(s), null);
      return nextRound(s, ctx);
    default:
      return fail("wrong_phase");
  }
}

/**
 * A player left the match (or struck out): they are out as they were, an
 * impostor or not. The match ends if that settles it; otherwise the step
 * goes on without them.
 */
export function impLeft(s: RoomState, id: PlayerId, ctx: Ctx) {
  const imp = s.imp;
  if (!imp?.dealt.includes(id) || imp.outs.some((o) => o.id === id)) return;
  imp.outs.push({
    id,
    round: imp.round,
    impostor: imp.impostors.includes(id),
    left: true,
    by: [],
    guess: null,
    hit: null,
  });
  if (imp.vote) {
    // votes for them come back, their own go
    for (const [by, target] of Object.entries(imp.vote.votes))
      if (by === id || target === id) {
        delete imp.vote.votes[by];
        if (s.deadline !== null && by !== id)
          s.deadline += imp.vote.cuts[by] ?? 0;
        delete imp.vote.cuts[by];
      }
    for (const [by, target] of Object.entries(imp.vote.points))
      if (by === id || target === id) delete imp.vote.points[by];
  }
  if (s.phase === "last_chance" && imp.guessing === id) {
    settleGuess(imp, null);
    return nextRound(s, ctx);
  }
  if (s.phase !== "replying" && s.phase !== "talking") return;
  const v = verdict(s);
  if (v && v.reason !== "rounds") return end(s, v, ctx);
  if (s.phase === "replying") {
    const q = openAsked(imp);
    if (q && everyoneAnswered(s, q)) revealReplies(s, ctx);
  } else if (everyoneVoted(s)) resolveVote(s, ctx);
}

/** The room's points for a finished match: the winning side, the right votes, a lucky last guess. */
export function impPoints(imp: ImpostorMatch): Record<PlayerId, number> {
  const points: Record<PlayerId, number> = {};
  for (const id of imp.dealt) points[id] = 0;
  const crewWon = imp.winner === "crew";
  for (const id of imp.dealt) {
    const impostor = imp.impostors.includes(id);
    if (imp.winner && crewWon !== impostor) points[id] += impostor ? 5 : 2;
  }
  for (const o of imp.outs) {
    if (o.impostor && !o.left)
      for (const by of o.by)
        if (!imp.impostors.includes(by)) points[by] = (points[by] ?? 0) + 1;
    if (o.hit) points[o.id] = (points[o.id] ?? 0) + 3;
  }
  return points;
}
