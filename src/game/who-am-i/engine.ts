// "Who am I?"'s rules, on the room's shared state: who picks for whom, the
// turns (ask, answer, guess, validate) and the places. Pure like the engine:
// the server supplies the characters, the clock is ctx.now.
import {
  findPlayer,
  isActive,
  isPresent,
  openQuestion,
  pendingGuess,
  validatorOf,
} from "../helpers";
import { isCloseMatch } from "../match";
import {
  cleanText,
  cutClock,
  fail,
  finish,
  guardStep,
  guessScene,
  handOverHost,
  longShows,
  presentCount,
  requireSeated,
  shuffle,
  stage,
  startStep,
  stepMs,
  TURN_PHASES,
} from "../steps";
import {
  type AnswerEntry,
  type Assignment,
  type Character,
  type Ctx,
  type GameEvent,
  MAX_CHARACTER_NAME,
  MAX_GUESS,
  MAX_NOTE,
  MAX_QUESTION,
  type PickDraft,
  type Play,
  type PlayerId,
  REVEAL_TIMING,
  type RoomState,
  SHOW_TIMING,
  type Theme,
} from "../types";
import {
  endsWithQuestionMark,
  withoutQuestionMark,
  withQuestionMark,
} from "./question";

type Question = Extract<Play, { kind: "question" }>;
type Guess = Extract<Play, { kind: "guess" }>;

/** The match's steps, from the picks to the last guess. */
const WHO_PHASES = new Set([
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
]);

/** Theme set: the turn order, who picks for whom, fresh outcomes. The theme show and the pick clock come after. */
export function beginMatch(s: RoomState, theme: Theme, ctx: Ctx) {
  s.round += 1;
  s.theme = theme;
  s.ideas = [];
  s.plays = [];
  s.turnPlayerId = null;
  // The opening may still be playing: the theme show queues after it.
  s.order = shuffle(
    s.players.map((p) => p.id),
    ctx.random,
  );
  s.assignments = {};
  s.outcomes = {};
  const n = s.order.length;
  s.order.forEach((picker, i) => {
    s.assignments[s.order[(i + 1) % n]] = {
      pickerId: picker,
      character: null,
      draft: null,
    };
  });
  for (const p of s.players) {
    s.outcomes[p.id] = {
      discoveredAt: null,
      place: null,
      round: null,
      gaveUp: false,
      endedAt: null,
    };
    p.strikes = 0;
    p.away = false;
  }
  s.playStartedAt = null;
  s.phase = "picking";
}

/** Out of the match without discovering: gave up, left or timed out (`away` tells which). */
function endOutcome(s: RoomState, id: PlayerId, ctx: Ctx) {
  s.outcomes[id].gaveUp = true;
  s.outcomes[id].endedAt = ctx.now;
}

function canPlay(s: RoomState, id: PlayerId) {
  const p = findPlayer(s, id);
  return !!p && isPresent(p) && isActive(s, id);
}

/** The next active, present player after `from` in turn order (wrapping, `from` itself last). */
function nextPlayerAfter(s: RoomState, from: PlayerId | null) {
  const order = s.order;
  const start = from ? order.indexOf(from) : -1;
  for (let k = 1; k <= order.length; k++) {
    const id = order[(start + k + order.length) % order.length];
    if (canPlay(s, id)) return id;
  }
  return null;
}

function goToTurn(s: RoomState, ctx: Ctx, from: PlayerId | null) {
  if (presentCount(s) < 2) return finish(s, ctx);
  const next = nextPlayerAfter(s, from);
  if (!next) return finish(s, ctx);
  // Back at (or before) where the last turn was in the order: a new turn round.
  const wrapped =
    from === null || s.order.indexOf(next) <= s.order.indexOf(from);
  if (wrapped) s.turnRound += 1;
  s.turnNumber += 1;
  s.phase = "asking";
  s.turnPlayerId = next;
  startStep(s, ctx, stepMs(s, "askSeconds"));
}

const nextTurn = (s: RoomState, ctx: Ctx) => goToTurn(s, ctx, s.turnPlayerId);

function answersRevealMs(q: Question) {
  const t = REVEAL_TIMING;
  const notes = q.answers.reduce((sum, a) => sum + (a.note?.length ?? 0), 0);
  const raw =
    t.answersBase + t.perAnswer * q.answers.length + t.perNoteChar * notes;
  return Math.min(t.answersMax, Math.max(t.answersMin, raw));
}

function othersAnswered(s: RoomState, q: Question) {
  return s.players.every(
    (p) => p.id === q.by || q.answers.some((a) => a.by === p.id),
  );
}

function fillMissingAnswers(s: RoomState, q: Question, onlyAway: boolean) {
  for (const p of s.players) {
    if (p.id === q.by || q.answers.some((a) => a.by === p.id)) continue;
    if (onlyAway && !p.away) continue;
    q.answers.push({ by: p.id, value: "unknown", note: null });
  }
}

function resolveQuestion(s: RoomState, q: Question, ctx: Ctx) {
  q.open = false;
  const ms = answersRevealMs(q);
  s.reveal = {
    kind: "answers",
    n: q.n,
    startsAt: ctx.now,
    until: ctx.now + ms,
  };
  s.phase = "guessing";
  startStep(s, ctx, stepMs(s, "guessSeconds"));
}

/**
 * Place for a discovery in turn round `round`: one more than everyone who
 * discovered in an earlier round. Discoveries in the same round tie (1, 1, 3),
 * since whoever comes later in the order had no turn of that round yet.
 */
function placeIn(s: RoomState, round: number) {
  const earlier = Object.values(s.outcomes).filter(
    (o) => o.discoveredAt !== null && (o.round ?? 0) < round,
  ).length;
  return earlier + 1;
}

function hit(s: RoomState, g: Guess, ctx: Ctx) {
  g.result = "hit";
  const round = s.turnRound;
  s.outcomes[g.by] = {
    discoveredAt: g.n,
    place: placeIn(s, round),
    round,
    gaveUp: false,
    endedAt: ctx.now,
  };
  guessScene(s, "guess", g.n, REVEAL_TIMING.guessHit, ctx);
  nextTurn(s, ctx);
}

function miss(s: RoomState, g: Guess, ctx: Ctx) {
  g.result = "miss";
  guessScene(s, "guess", g.n, REVEAL_TIMING.guessMiss, ctx);
  nextTurn(s, ctx);
}

/** The turn player let the guess go (or its clock ran out): a short scene says so. */
function pass(s: RoomState, ctx: Ctx) {
  guessScene(s, "pass", s.turnNumber, REVEAL_TIMING.pass, ctx);
  nextTurn(s, ctx);
}

/** The turn player gives up or leaves: close whatever they had open, without a reveal. */
function abandonTurn(s: RoomState, ctx: Ctx) {
  const q = openQuestion(s);
  if (q && q.by === s.turnPlayerId) {
    fillMissingAnswers(s, q, false);
    q.open = false;
  }
  const g = pendingGuess(s);
  if (g && g.by === s.turnPlayerId) g.result = "miss";
  nextTurn(s, ctx);
}

/**
 * Every card is set: the cast show (everyone picked or "Time!", whose
 * character you got, the turn order), then the first turn's clock.
 */
function startTurns(s: RoomState, ctx: Ctx, how: "confirmed" | "timeout") {
  const first = longShows(s, s.round);
  const v = first ? "first" : "later";
  const T = SHOW_TIMING;
  // The first question can come once the cast is over.
  s.playStartedAt = stage(
    s,
    "cast",
    s.round,
    first,
    [
      ["picked", how === "timeout" ? T.picked.timeout : T.picked.confirmed[v]],
      ["received", T.received[v]],
      ["order", T.order[v]],
      ["entrance", T.entrance.turn[v]],
    ],
    ctx,
  );
  s.turnRound = 0;
  s.turnNumber = 0;
  // Its clock waits for the cast.
  goToTurn(s, ctx, s.order.at(-1) ?? null);
}

/** The card `playerId` fills, still open for edits. */
function openCard(s: RoomState, playerId: PlayerId): Assignment {
  if (s.phase !== "picking") fail("wrong_phase");
  const a =
    Object.values(s.assignments).find((x) => x.pickerId === playerId) ??
    fail("not_member");
  if (a.character) fail("already_done");
  return a;
}

const clone = (c: Character): Character => ({
  ...c,
  aliases: [...c.aliases],
});

const DRAFT_ID_MAX = 200;
const DRAFT_URL_MAX = 500;

const optionalText = (v: unknown, max: number) =>
  v === null || (typeof v === "string" && v.length <= max);

/** Saves what is on the picker's card; null empties it. Never after the clock ran out. */
export function draft(
  s: RoomState,
  playerId: PlayerId,
  d: PickDraft | null,
  ctx: Ctx,
) {
  const a = openCard(s, playerId);
  if (s.deadline !== null && ctx.now >= s.deadline) fail("wrong_phase");
  if (d === null) {
    a.draft = null;
    return;
  }
  const ok =
    typeof d === "object" &&
    typeof d.name === "string" &&
    d.name.length <= MAX_CHARACTER_NAME &&
    optionalText(d.characterId, DRAFT_ID_MAX) &&
    optionalText(d.imageUrl, DRAFT_URL_MAX) &&
    optionalText(d.newId, DRAFT_ID_MAX) &&
    (d.suggested === undefined || d.suggested === true);
  if (!ok) fail("invalid_input");
  a.draft = {
    characterId: d.characterId,
    name: d.name,
    imageUrl: d.imageUrl,
    newId: d.newId,
    ...(d.suggested ? { suggested: true as const } : {}),
  };
}

export function pick(
  s: RoomState,
  playerId: PlayerId,
  character: Character,
  suggested: boolean,
  ctx: Ctx,
) {
  const a = openCard(s, playerId);
  a.character = clone(character);
  if (suggested) a.suggested = true;
  a.draft = null;
  if (Object.values(s.assignments).every((x) => x.character))
    startTurns(s, ctx, "confirmed");
}

/**
 * A card the clock found unconfirmed but not empty: whatever is on it is the
 * pick. The server normally hands in the real character (`drafted`); if it
 * could not, the card still plays as typed.
 */
function fromDraft(
  s: RoomState,
  target: PlayerId,
  a: Assignment,
  drafted: Record<PlayerId, Character> | undefined,
): Character | null {
  const made = drafted?.[a.pickerId];
  if (made) return clone(made);
  const d = a.draft;
  const name = d?.name.trim().replace(/\s+/g, " ");
  if (!d || !name) return null;
  return {
    id: d.newId ?? `draft-${s.code}-${s.round}-${target}`,
    lang: findPlayer(s, a.pickerId)?.lang ?? "en",
    name,
    origin: null,
    imageUrl: d.imageUrl,
    aliases: [],
  };
}

export function ask(s: RoomState, playerId: PlayerId, text: string, ctx: Ctx) {
  if (s.phase !== "asking") fail("wrong_phase");
  guardStep(s, ctx);
  if (playerId !== s.turnPlayerId) fail("not_your_turn");
  const typed = cleanText(text, MAX_QUESTION);
  // Nothing but question marks is no question.
  if (!withoutQuestionMark(typed).trim()) fail("invalid_input");
  const q: Question = {
    n: s.turnNumber,
    kind: "question",
    by: playerId,
    text: endsWithQuestionMark(typed)
      ? typed
      : cleanText(withQuestionMark(typed, "?"), MAX_QUESTION),
    answers: [],
    open: true,
  };
  s.plays.push(q);
  const asker = findPlayer(s, playerId);
  if (asker) asker.strikes = 0;
  fillMissingAnswers(s, q, true);
  if (othersAnswered(s, q)) return resolveQuestion(s, q, ctx);
  s.phase = "answering";
  startStep(s, ctx, stepMs(s, "answerSeconds"));
}

export function answer(
  s: RoomState,
  playerId: PlayerId,
  value: AnswerEntry["value"],
  note: string | null,
  ctx: Ctx,
) {
  if (s.phase !== "answering") fail("wrong_phase");
  guardStep(s, ctx);
  requireSeated(s, playerId);
  const q = openQuestion(s) ?? fail("wrong_phase");
  if (playerId === q.by) fail("not_your_turn");
  if (q.answers.some((a) => a.by === playerId)) fail("already_done");
  const n = note?.trim() ?? "";
  if (n.length > MAX_NOTE) fail("invalid_input");
  q.answers.push({ by: playerId, value, note: n || null });
  if (othersAnswered(s, q)) resolveQuestion(s, q, ctx);
  else cutClock(s, ctx, "answerSeconds", s.players.length - 1);
}

export function guess(
  s: RoomState,
  playerId: PlayerId,
  text: string,
  ctx: Ctx,
) {
  if (s.phase !== "guessing") fail("wrong_phase");
  guardStep(s, ctx);
  if (playerId !== s.turnPlayerId) fail("not_your_turn");
  const g: Guess = {
    n: s.turnNumber,
    kind: "guess",
    by: playerId,
    text: cleanText(text, MAX_GUESS),
    result: "pending",
  };
  s.plays.push(g);
  const c = s.assignments[playerId]?.character;
  if (c && isCloseMatch(g.text, [c.name, ...c.aliases])) return hit(s, g, ctx);
  s.phase = "validating";
  startStep(s, ctx, stepMs(s, "validateSeconds"));
}

export function giveUp(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (!WHO_PHASES.has(s.phase)) fail("wrong_phase");
  requireSeated(s, playerId);
  if (!isActive(s, playerId)) fail("already_done");
  endOutcome(s, playerId, ctx);
  if (TURN_PHASES.has(s.phase) && s.turnPlayerId === playerId) {
    return abandonTurn(s, ctx);
  }
  const anyoneLeft = s.players.some((p) => canPlay(s, p.id));
  if (TURN_PHASES.has(s.phase) && !anyoneLeft) finish(s, ctx);
}

/** The turn player lets the guess go. */
export function passGuess(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (s.phase !== "guessing") fail("wrong_phase");
  guardStep(s, ctx);
  if (playerId !== s.turnPlayerId) fail("not_your_turn");
  pass(s, ctx);
}

/** The guesser's validator says whether the typed guess names their character. */
export function validate(
  s: RoomState,
  playerId: PlayerId,
  correct: boolean,
  ctx: Ctx,
) {
  if (s.phase !== "validating") fail("wrong_phase");
  guardStep(s, ctx);
  const g = pendingGuess(s) ?? fail("wrong_phase");
  if (playerId !== validatorOf(s, g.by)) fail("not_your_turn");
  return correct ? hit(s, g, ctx) : miss(s, g, ctx);
}

/** Someone left mid-match (their seat stays, away): their turn or answer is closed for them. */
export function whoLeft(s: RoomState, id: PlayerId, ctx: Ctx) {
  if (isActive(s, id)) endOutcome(s, id, ctx);
  if (TURN_PHASES.has(s.phase) && s.turnPlayerId === id) {
    abandonTurn(s, ctx);
  } else if (s.phase === "answering") {
    const q = openQuestion(s);
    if (q) {
      fillMissingAnswers(s, q, true);
      if (othersAnswered(s, q)) resolveQuestion(s, q, ctx);
    }
  }
  if (WHO_PHASES.has(s.phase) && presentCount(s) < 2) finish(s, ctx);
}

/** A step's clock ran out. */
export function whoTimeout(
  s: RoomState,
  e: Extract<GameEvent, { type: "TIMEOUT" }>,
  ctx: Ctx,
) {
  switch (s.phase) {
    case "picking": {
      // Whatever is on a card is the pick; only empty cards get a fallback.
      for (const [target, a] of Object.entries(s.assignments)) {
        if (a.character) continue;
        const mine = fromDraft(s, target, a, e.drafted);
        if (mine) a.character = mine;
        if (mine && a.draft?.suggested) a.suggested = true;
      }
      const used = new Set(
        Object.values(s.assignments).flatMap((a) =>
          a.character ? [a.character.id] : [],
        ),
      );
      const pool = (e.fallbackCharacters ?? []).filter((c) => !used.has(c.id));
      for (const a of Object.values(s.assignments)) {
        if (a.character) continue;
        a.character = clone(pool.shift() ?? fail("invalid_input"));
        a.auto = true;
      }
      for (const a of Object.values(s.assignments)) a.draft = null;
      return startTurns(s, ctx, "timeout");
    }
    case "asking": {
      const p = s.turnPlayerId ? findPlayer(s, s.turnPlayerId) : undefined;
      if (p) {
        p.strikes += 1;
        if (p.strikes >= 2) {
          p.away = true;
          handOverHost(s);
          endOutcome(s, p.id, ctx);
        }
      }
      return nextTurn(s, ctx);
    }
    case "answering": {
      const q = openQuestion(s) ?? fail("wrong_phase");
      fillMissingAnswers(s, q, false);
      return resolveQuestion(s, q, ctx);
    }
    case "guessing":
      return pass(s, ctx);
    case "validating": {
      const g = pendingGuess(s) ?? fail("wrong_phase");
      return miss(s, g, ctx);
    }
    default:
      return fail("wrong_phase");
  }
}
