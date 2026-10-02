// The rules. Pure functions: same input, same output; no clock, no randomness, no I/O of their own.

import { isGameKey } from "./games";
import {
  findPlayer,
  isActive,
  isPresent,
  openQuestion,
  pendingGuess,
  validatorOf,
} from "./helpers";
import { isCloseMatch } from "./match";
import {
  endsWithQuestionMark,
  withoutQuestionMark,
  withQuestionMark,
} from "./question";
import { isThemeSet, THEME_SET_KEYS } from "./theme-sets";
import {
  type AnswerEntry,
  type Character,
  type Ctx,
  DEFAULT_SETTINGS,
  type ErrorCode,
  GameError,
  type GameEvent,
  HOST_THEME_SECONDS,
  type Identity,
  LOBBY_SECONDS,
  MAX_GUESS,
  MAX_NOTE,
  MAX_QUESTION,
  MAX_THEME,
  type Play,
  type PlayerId,
  RESULT_SECONDS,
  REVEAL_TIMING,
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  type RoomSettings,
  type RoomState,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
  THEME_IDEAS,
  THEME_OPTIONS,
  type Theme,
  VOTE_SECONDS,
} from "./types";

type Question = Extract<Play, { kind: "question" }>;
type Guess = Extract<Play, { kind: "guess" }>;

const fail = (code: ErrorCode): never => {
  throw new GameError(code);
};

// --- settings ----------------------------------------------------------------

function mergeSettings(
  base: RoomSettings,
  patch: Partial<RoomSettings>,
  seated: number,
): RoomSettings {
  const allowed = new Set([
    "game",
    "name",
    "visibility",
    "password",
    "seats",
    "stepSeconds",
    "mode",
    "themeMode",
    "themeSets",
  ]);
  if (Object.keys(patch).some((k) => !allowed.has(k))) fail("invalid_input");
  // Rooms made before a setting existed get its default.
  const next = { ...DEFAULT_SETTINGS, ...base, ...patch };
  const sets: unknown = next.themeSets;
  const name: unknown = next.name;
  const password: unknown = next.password;
  const ok =
    isGameKey(next.game) &&
    typeof name === "string" &&
    name.trim().length <= ROOM_NAME_MAX &&
    (next.visibility === "public" || next.visibility === "private") &&
    typeof password === "string" &&
    password.trim().length <= ROOM_PASSWORD_MAX &&
    // a private room needs a password to ask for
    (next.visibility === "public" || password.trim().length > 0) &&
    [2, 3, 4].includes(next.seats) &&
    next.seats >= seated &&
    Number.isInteger(next.stepSeconds) &&
    next.stepSeconds >= STEP_SECONDS_MIN &&
    next.stepSeconds <= STEP_SECONDS_MAX &&
    next.mode === "classic" &&
    (next.themeMode === "vote" || next.themeMode === "host") &&
    Array.isArray(sets) &&
    sets.length > 0 &&
    sets.every(isThemeSet);
  if (!ok) fail("invalid_input");
  // Each set once, in the order the screens show them.
  const themeSets = THEME_SET_KEYS.filter((k) => next.themeSets.includes(k));
  return {
    ...next,
    name: next.name.trim(),
    // a public room keeps no password around
    password: next.visibility === "private" ? next.password.trim() : "",
    themeSets,
  };
}

// --- clock -------------------------------------------------------------------

/** Starts a step; it never begins before a reveal on screen is over. */
function startStep(s: RoomState, ctx: Ctx, ms: number) {
  const start = Math.max(ctx.now, s.reveal?.until ?? 0);
  s.stepStartsAt = start;
  s.deadline = start + ms;
}

const stepMs = (s: RoomState) => s.settings.stepSeconds * 1000;

function stopClock(s: RoomState) {
  s.deadline = null;
  s.stepStartsAt = null;
}

/** The lobby clock (re)starts once there are two to play; alone, the room just waits. */
function lobbyClock(s: RoomState, ctx: Ctx) {
  if (s.players.length < 2) stopClock(s);
  else startStep(s, ctx, LOBBY_SECONDS * 1000);
}

function guardStep(s: RoomState, ctx: Ctx) {
  if (s.stepStartsAt !== null && ctx.now < s.stepStartsAt) fail("too_early");
}

// --- shared steps --------------------------------------------------------------

function requireSeated(s: RoomState, id: PlayerId) {
  return findPlayer(s, id) ?? fail("not_member");
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A new round needs a theme: the host types it, or everyone votes on `themes`. */
function beginTheme(s: RoomState, themes: Theme[] | undefined, ctx: Ctx) {
  if (s.settings.themeMode === "host") return beginTheming(s, themes, ctx);
  beginVote(s, themes, ctx);
}

/** The host types the theme; `ideas` help them. If the clock runs out, everyone votes instead. */
function beginTheming(s: RoomState, ideas: Theme[] | undefined, ctx: Ctx) {
  s.ideas = (ideas ?? []).slice(0, THEME_IDEAS).map((t) => ({ ...t }));
  s.vote = null;
  s.theme = null;
  s.reveal = null;
  s.turnPlayerId = null;
  s.phase = "theming";
  startStep(s, ctx, HOST_THEME_SECONDS * 1000);
}

/** Puts THEME_OPTIONS themes to the vote; the match starts once it is over. */
function beginVote(s: RoomState, themes: Theme[] | undefined, ctx: Ctx) {
  if (!themes || themes.length !== THEME_OPTIONS) fail("invalid_input");
  s.vote = {
    options: (themes ?? []).map((t) => ({ ...t })),
    votes: {},
    chosen: null,
    tied: [],
  };
  s.ideas = [];
  s.theme = null;
  s.reveal = null;
  s.turnPlayerId = null;
  s.phase = "voting";
  startStep(s, ctx, VOTE_SECONDS * 1000);
}

/** Most votes wins; a tie (or nobody voting) is drawn. Then the match starts behind the reveal. */
function closeVote(s: RoomState, ctx: Ctx) {
  const v = s.vote ?? fail("wrong_phase");
  const counts = v.options.map(() => 0);
  for (const p of s.players) {
    const option = v.votes[p.id];
    if (option !== undefined) counts[option] += 1;
  }
  const most = Math.max(...counts);
  v.tied = counts.flatMap((n, i) => (n === most ? [i] : []));
  v.chosen = v.tied[Math.floor(ctx.random() * v.tied.length)];
  beginMatch(s, v.options[v.chosen], ctx);
  const t = REVEAL_TIMING;
  revealTheme(s, t.theme + (v.tied.length > 1 ? t.themeTieSpin : 0), ctx);
}

/** Everyone looks at the theme for `ms`; picking starts right after. */
function revealTheme(s: RoomState, ms: number, ctx: Ctx) {
  s.reveal = {
    kind: "theme",
    n: s.round,
    startsAt: ctx.now,
    until: ctx.now + ms,
  };
  startStep(s, ctx, stepMs(s));
}

function setTheme(s: RoomState, playerId: PlayerId, text: string, ctx: Ctx) {
  if (s.phase !== "theming") fail("wrong_phase");
  requireSeated(s, playerId);
  if (playerId !== s.hostId) fail("not_host");
  const t = cleanText(text.replace(/\s+/g, " "), MAX_THEME);
  beginMatch(s, { en: t, pt: t, ja: t, set: null }, ctx);
  revealTheme(s, REVEAL_TIMING.theme, ctx);
}

const everyoneVoted = (s: RoomState) =>
  s.players.every((p) => s.vote?.votes[p.id] !== undefined);

function vote(s: RoomState, playerId: PlayerId, option: number, ctx: Ctx) {
  if (s.phase !== "voting") fail("wrong_phase");
  requireSeated(s, playerId);
  const v = s.vote ?? fail("wrong_phase");
  if (!Number.isInteger(option) || option < 0 || option >= v.options.length)
    fail("invalid_input");
  v.votes[playerId] = option;
  if (everyoneVoted(s)) closeVote(s, ctx);
}

function beginMatch(s: RoomState, theme: Theme, ctx: Ctx) {
  s.round += 1;
  s.theme = theme;
  s.ideas = [];
  s.plays = [];
  s.turnPlayerId = null;
  s.reveal = null;
  s.order = shuffle(
    s.players.map((p) => p.id),
    ctx.random,
  );
  s.assignments = {};
  s.outcomes = {};
  const n = s.order.length;
  s.order.forEach((picker, i) => {
    s.assignments[s.order[(i + 1) % n]] = { pickerId: picker, character: null };
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
  startStep(s, ctx, stepMs(s));
}

/** Out of the match without discovering: gave up, left or timed out (`away` tells which). */
function endOutcome(s: RoomState, id: PlayerId, ctx: Ctx) {
  s.outcomes[id].gaveUp = true;
  s.outcomes[id].endedAt = ctx.now;
}

/** The podium; its clock (after the last reveal) takes everyone back to the lobby. */
function finish(s: RoomState, ctx: Ctx) {
  s.phase = "finished";
  s.turnPlayerId = null;
  startStep(s, ctx, RESULT_SECONDS * 1000);
}

const presentCount = (s: RoomState) => s.players.filter(isPresent).length;

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
  if (wrapped) s.turnRound = (s.turnRound ?? 0) + 1;
  s.phase = "asking";
  s.turnPlayerId = next;
  startStep(s, ctx, stepMs(s));
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
  startStep(s, ctx, stepMs(s));
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
  // A match saved before ties existed has no rounds yet: places just count up.
  const place =
    round === undefined
      ? Object.values(s.outcomes).filter((o) => o.discoveredAt !== null)
          .length + 1
      : placeIn(s, round);
  s.outcomes[g.by] = {
    discoveredAt: g.n,
    place,
    round: round ?? null,
    gaveUp: false,
    endedAt: ctx.now,
  };
  const until = ctx.now + REVEAL_TIMING.guessHit;
  s.reveal = { kind: "guess", n: g.n, startsAt: ctx.now, until };
  nextTurn(s, ctx);
}

function miss(s: RoomState, g: Guess, ctx: Ctx) {
  g.result = "miss";
  const until = ctx.now + REVEAL_TIMING.guessMiss;
  s.reveal = { kind: "guess", n: g.n, startsAt: ctx.now, until };
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

/** Phases where leaving gives up the seat: no match is being played. */
const BEFORE_MATCH = new Set(["lobby", "theming", "voting", "finished"]);
const MATCH_PHASES = new Set([
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
]);
const TURN_PHASES = new Set(["asking", "answering", "guessing", "validating"]);

function cleanText(text: string, max: number) {
  const t = text.trim();
  if (!t || t.length > max) fail("invalid_input");
  return t;
}

function startTurns(s: RoomState, ctx: Ctx) {
  s.playStartedAt = ctx.now;
  s.turnRound = 0;
  goToTurn(s, ctx, s.order.at(-1) ?? null);
}

// --- public API ------------------------------------------------------------------

/** A brand-new room in the lobby, with the host seated. */
export function createRoom(
  code: string,
  host: Identity,
  settings: RoomSettings,
  ctx: Ctx,
): RoomState {
  const valid = mergeSettings(settings, {}, 1);
  return {
    code,
    hostId: host.id,
    settings: valid,
    phase: "lobby",
    players: [
      { ...host, ready: true, joinedAt: ctx.now, strikes: 0, away: false },
    ],
    order: [],
    theme: null,
    vote: null,
    ideas: [],
    assignments: {},
    turnPlayerId: null,
    plays: [],
    outcomes: {},
    deadline: null,
    stepStartsAt: null,
    reveal: null,
    round: 0,
    playStartedAt: null,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}

/** True when the current step's clock has run out and a TIMEOUT event is due. */
export function isExpired(state: RoomState, now: number): boolean {
  return state.deadline !== null && now >= state.deadline;
}

/** Applies one event. Returns a new state; throws GameError when the event is not allowed. */
export function reduce(
  state: RoomState,
  event: GameEvent,
  ctx: Ctx,
): RoomState {
  const s = structuredClone(state);
  apply(s, event, ctx);
  s.updatedAt = ctx.now;
  return s;
}

function apply(s: RoomState, e: GameEvent, ctx: Ctx) {
  switch (e.type) {
    case "JOIN":
      return join(s, e.player, e.password, ctx);
    case "LEAVE":
      return leave(s, e.playerId, ctx);
    case "SET_READY": {
      if (s.phase !== "lobby") fail("wrong_phase");
      const p = requireSeated(s, e.playerId);
      if (p.id === s.hostId) fail("invalid_input");
      p.ready = e.ready;
      return;
    }
    case "UPDATE_SETTINGS": {
      requireSeated(s, e.playerId);
      if (e.playerId !== s.hostId) fail("not_host");
      if (s.phase !== "lobby") fail("wrong_phase");
      s.settings = mergeSettings(s.settings, e.settings, s.players.length);
      return;
    }
    case "UPDATE_IDENTITY": {
      const p = requireSeated(s, e.player.id);
      Object.assign(p, identityFields(e.player));
      return;
    }
    case "SWAP_PLAYER":
      return swapPlayer(s, e.from, e.player);
    case "START": {
      requireSeated(s, e.playerId);
      if (e.playerId !== s.hostId) fail("not_host");
      if (s.phase !== "lobby") fail("wrong_phase");
      if (s.players.length < 2) fail("need_two_players");
      return beginTheme(s, e.themes, ctx);
    }
    case "VOTE":
      return vote(s, e.playerId, e.option, ctx);
    case "SET_THEME":
      return setTheme(s, e.playerId, e.text, ctx);
    case "PICK":
      return pick(s, e.playerId, e.character, ctx);
    case "ASK":
      return ask(s, e.playerId, e.text, ctx);
    case "ANSWER":
      return answer(s, e.playerId, e.value, e.note, ctx);
    case "GUESS":
      return guess(s, e.playerId, e.text, ctx);
    case "PASS": {
      if (s.phase !== "guessing") fail("wrong_phase");
      guardStep(s, ctx);
      if (e.playerId !== s.turnPlayerId) fail("not_your_turn");
      return nextTurn(s, ctx);
    }
    case "VALIDATE": {
      if (s.phase !== "validating") fail("wrong_phase");
      guardStep(s, ctx);
      const g = pendingGuess(s) ?? fail("wrong_phase");
      if (e.playerId !== validatorOf(s, g.by)) fail("not_your_turn");
      return e.correct ? hit(s, g, ctx) : miss(s, g, ctx);
    }
    case "GIVE_UP":
      return giveUp(s, e.playerId, ctx);
    case "BACK_TO_LOBBY": {
      requireSeated(s, e.playerId);
      if (e.playerId !== s.hostId) fail("not_host");
      if (s.phase !== "finished") fail("wrong_phase");
      return backToLobby(s, ctx);
    }
    case "TIMEOUT":
      return timeout(s, e, ctx);
  }
}

function identityFields(p: Identity) {
  return {
    name: p.name,
    isGuest: p.isGuest,
    guestNumber: p.guestNumber,
    avatar: p.avatar,
    lang: p.lang,
  };
}

/** Every trace of `from` in the room becomes `player.id`: seat, host, turn order, picks, plays, outcome, vote. */
function swapPlayer(s: RoomState, from: PlayerId, player: Identity) {
  if (s.phase === "closed") fail("not_found");
  const seat = requireSeated(s, from);
  const to = player.id;
  if (to === from) return;
  if (findPlayer(s, to)) fail("already_done");
  Object.assign(seat, identityFields(player), { id: to });
  const swap = (id: PlayerId) => (id === from ? to : id);
  s.hostId = swap(s.hostId);
  s.order = s.order.map(swap);
  if (s.turnPlayerId) s.turnPlayerId = swap(s.turnPlayerId);
  const assignments: RoomState["assignments"] = {};
  for (const [owner, a] of Object.entries(s.assignments))
    assignments[swap(owner)] = { ...a, pickerId: swap(a.pickerId) };
  s.assignments = assignments;
  if (from in s.outcomes) {
    s.outcomes[to] = s.outcomes[from];
    delete s.outcomes[from];
  }
  for (const play of s.plays) {
    play.by = swap(play.by);
    if (play.kind === "question")
      for (const a of play.answers) a.by = swap(a.by);
  }
  if (s.vote && from in s.vote.votes) {
    s.vote.votes[to] = s.vote.votes[from];
    delete s.vote.votes[from];
  }
}

function join(
  s: RoomState,
  player: Identity,
  password: string | undefined,
  ctx: Ctx,
) {
  if (s.phase === "closed") fail("not_found");
  const seated = findPlayer(s, player.id);
  if (seated) {
    Object.assign(seated, identityFields(player));
    return;
  }
  if (s.phase !== "lobby") fail("already_started");
  if (s.players.length >= s.settings.seats) fail("room_full");
  // Only newcomers are asked: whoever already has a seat comes back freely.
  const lock = s.settings.visibility === "private" ? s.settings.password : "";
  if (lock) {
    if (!password?.trim()) fail("password_required");
    if (password?.trim() !== lock) fail("wrong_password");
  }
  s.players.push({
    ...player,
    ready: false,
    joinedAt: ctx.now,
    strikes: 0,
    away: false,
  });
  lobbyClock(s, ctx);
}

/** When the host is gone (or away mid-match), the room goes to whoever joined first. */
function handOverHost(s: RoomState) {
  const host = findPlayer(s, s.hostId);
  if (host && isPresent(host)) return;
  const next =
    s.players.find((p) => isPresent(p) && p.id !== s.hostId) ??
    (host ? null : s.players[0]);
  if (next) {
    s.hostId = next.id;
    next.ready = true;
  }
}

function leave(s: RoomState, id: PlayerId, ctx: Ctx) {
  const p = requireSeated(s, id);
  if (s.phase === "closed") fail("wrong_phase");
  if (BEFORE_MATCH.has(s.phase)) {
    s.players = s.players.filter((x) => x.id !== id);
    if (s.players.length === 0) {
      s.phase = "closed";
      stopClock(s);
      return;
    }
    // Leaving while typing the theme hands the typing over with the room.
    handOverHost(s);
    if (s.phase === "lobby" && s.players.length < 2) stopClock(s);
    if (s.phase !== "voting" && s.phase !== "theming") return;
    if (s.vote) delete s.vote.votes[id];
    // Nobody left to play with: back to the lobby to wait for others.
    if (s.players.length < 2) {
      s.phase = "lobby";
      s.vote = null;
      s.ideas = [];
      lobbyClock(s, ctx);
      return;
    }
    if (s.phase === "voting" && everyoneVoted(s)) closeVote(s, ctx);
    return;
  }
  // mid-match: keep the seat so the history still makes sense
  p.away = true;
  handOverHost(s);
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
  if (MATCH_PHASES.has(s.phase) && presentCount(s) < 2) finish(s, ctx);
}

function pick(
  s: RoomState,
  playerId: PlayerId,
  character: Character,
  ctx: Ctx,
) {
  if (s.phase !== "picking") fail("wrong_phase");
  const target = Object.keys(s.assignments).find(
    (t) => s.assignments[t].pickerId === playerId,
  );
  if (!target) return fail("not_member");
  const a = s.assignments[target];
  if (a.character) fail("already_done");
  a.character = { ...character, aliases: [...character.aliases] };
  if (Object.values(s.assignments).every((x) => x.character))
    startTurns(s, ctx);
}

function ask(s: RoomState, playerId: PlayerId, text: string, ctx: Ctx) {
  if (s.phase !== "asking") fail("wrong_phase");
  guardStep(s, ctx);
  if (playerId !== s.turnPlayerId) fail("not_your_turn");
  const typed = cleanText(text, MAX_QUESTION);
  // Nothing but question marks is no question.
  if (!withoutQuestionMark(typed).trim()) fail("invalid_input");
  const q: Question = {
    n: s.plays.length + 1,
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
  startStep(s, ctx, stepMs(s));
}

function answer(
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
}

function guess(s: RoomState, playerId: PlayerId, text: string, ctx: Ctx) {
  if (s.phase !== "guessing") fail("wrong_phase");
  guardStep(s, ctx);
  if (playerId !== s.turnPlayerId) fail("not_your_turn");
  const g: Guess = {
    n: s.plays.length + 1,
    kind: "guess",
    by: playerId,
    text: cleanText(text, MAX_GUESS),
    result: "pending",
  };
  s.plays.push(g);
  const c = s.assignments[playerId]?.character;
  if (c && isCloseMatch(g.text, [c.name, ...c.aliases])) return hit(s, g, ctx);
  s.phase = "validating";
  startStep(s, ctx, stepMs(s));
}

function giveUp(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  if (!MATCH_PHASES.has(s.phase)) fail("wrong_phase");
  requireSeated(s, playerId);
  if (!isActive(s, playerId)) fail("already_done");
  endOutcome(s, playerId, ctx);
  if (TURN_PHASES.has(s.phase) && s.turnPlayerId === playerId) {
    return abandonTurn(s, ctx);
  }
  const anyoneLeft = s.players.some((p) => canPlay(s, p.id));
  if (TURN_PHASES.has(s.phase) && !anyoneLeft) finish(s, ctx);
}

/**
 * From the podium to a fresh lobby: whoever left the match loses their seat,
 * everyone but the host marks "ready" again, and the lobby clock restarts.
 * The vote stays, so the next one avoids its themes.
 */
function backToLobby(s: RoomState, ctx: Ctx) {
  s.players = s.players.filter(isPresent);
  if (s.players.length === 0) {
    s.phase = "closed";
    return stopClock(s);
  }
  handOverHost(s);
  for (const p of s.players) {
    p.ready = p.id === s.hostId;
    p.strikes = 0;
  }
  s.phase = "lobby";
  s.theme = null;
  s.ideas = [];
  s.order = [];
  s.assignments = {};
  s.outcomes = {};
  s.plays = [];
  s.turnPlayerId = null;
  s.reveal = null;
  s.playStartedAt = null;
  lobbyClock(s, ctx);
}

function timeout(
  s: RoomState,
  e: Extract<GameEvent, { type: "TIMEOUT" }>,
  ctx: Ctx,
) {
  if (!isExpired(s, ctx.now)) fail("wrong_phase");
  switch (s.phase) {
    case "lobby": {
      if (s.players.length < 2) return stopClock(s);
      return beginTheme(s, e.themes, ctx);
    }
    case "theming":
      return beginVote(s, e.themes, ctx);
    case "voting":
      return closeVote(s, ctx);
    case "finished":
      return backToLobby(s, ctx);
    case "picking": {
      const used = new Set(
        Object.values(s.assignments).flatMap((a) =>
          a.character ? [a.character.id] : [],
        ),
      );
      const pool = (e.fallbackCharacters ?? []).filter((c) => !used.has(c.id));
      for (const a of Object.values(s.assignments)) {
        if (a.character) continue;
        const c = pool.shift() ?? fail("invalid_input");
        a.character = { ...c, aliases: [...c.aliases] };
        a.auto = true;
      }
      return startTurns(s, ctx);
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
      return nextTurn(s, ctx);
    case "validating": {
      const g = pendingGuess(s) ?? fail("wrong_phase");
      return miss(s, g, ctx);
    }
    default:
      return fail("wrong_phase");
  }
}
