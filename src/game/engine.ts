// The room's rules: seats, settings, the theme steps the games share and the
// event switch. Each game's own rules live in its folder (who-am-i, impostor,
// lineup). Pure functions: same input, same output; no clock, no randomness,
// no I/O of their own.

import { GAME_SEATS, isGameKey } from "./games";
import { findPlayer, goneFor, isPresent, presenceDue } from "./helpers";
import {
  accuse,
  beginImpostor,
  dontKnow,
  impLeft,
  impTimeout,
  lastGuess,
  point,
  reply,
  unaccuse,
  unreply,
} from "./impostor/engine";
import type { ImpDeal } from "./impostor/types";
import {
  answerOffer,
  beginLineup,
  bid,
  cancelOffer,
  chooseMission,
  fold,
  giveVerdict,
  hunch,
  judge,
  cue as luCue,
  luLeft,
  luTimeout,
  markDone,
  offer,
  presented,
  rate,
  react,
  saveBoard,
  setQueue,
} from "./lineup/engine";
import {
  COINS,
  HOST_MIN_PEOPLE,
  LOTS_PER_SEAT,
  OFF_MISSIONS_MAX,
  ROUNDS,
} from "./lineup/rules";
import { LU_PHASES } from "./lineup/types";
import { pickColorSlot } from "./seat-colors";
import {
  cleanText,
  countMatch,
  cutClock,
  fail,
  handOverHost,
  longShows,
  type Part,
  requireSeated,
  stage,
  startStep,
  stepMs,
  stopClock,
  titlePart,
} from "./steps";
import { isTaste, TASTE_KEYS } from "./tastes";
import {
  BAN_MS,
  type Ctx,
  DEFAULT_SETTINGS,
  type GameEvent,
  HOST_THEME_SECONDS,
  type Identity,
  KICK_MS,
  MAX_THEME,
  OFF_THEMES_MAX,
  PICK_SECONDS,
  type PlayerId,
  ROOM_NAME_MAX,
  ROOM_PASSWORD_MAX,
  type RoomSettings,
  type RoomState,
  type RuleExamples,
  SHOW_TIMING,
  START_LEAD_MS,
  START_WAIT_MS,
  STEP_SECONDS_MAX,
  STEP_SECONDS_MIN,
  STEP_TIMES,
  type StartFields,
  THEME_IDEAS,
  THEME_OPTIONS,
  type Theme,
} from "./types";
import {
  answer,
  ask,
  beginMatch,
  draft,
  giveUp,
  guess,
  passGuess,
  pick,
  validate,
  whoLeft,
  whoTimeout,
} from "./who-am-i/engine";

// --- settings ----------------------------------------------------------------

/** A theme id as theme-id.ts makes it. */
const THEME_ID = /^[a-z0-9-]{1,80}$/;

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
    ...STEP_TIMES,
    "mode",
    "themeMode",
    "offTastes",
    "offThemes",
    "impostors",
    "coins",
    "lotsPerSeat",
    "rounds",
    "interval",
    "trades",
    "heavy",
    "offMissions",
    "watchChat",
  ]);
  if (Object.keys(patch).some((k) => !allowed.has(k))) fail("invalid_input");
  const next = { ...DEFAULT_SETTINGS, ...base, ...patch };
  // another game keeps the seats where its range allows
  if (
    patch.game !== undefined &&
    patch.seats === undefined &&
    isGameKey(next.game)
  ) {
    const range = GAME_SEATS[next.game];
    next.seats = Math.min(range.max, Math.max(range.min, seated, next.seats));
  }
  const impostors: unknown = next.impostors;
  const offTastes: unknown = next.offTastes ?? [];
  const offThemes: unknown = next.offThemes ?? [];
  const offMissions: unknown = next.offMissions ?? [];
  const rounds: unknown = next.rounds;
  const inRange = (v: unknown, r: { min: number; max: number }) =>
    Number.isInteger(v) && (v as number) >= r.min && (v as number) <= r.max;
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
    Number.isInteger(next.seats) &&
    next.seats >= GAME_SEATS[next.game].min &&
    next.seats <= GAME_SEATS[next.game].max &&
    next.seats >= seated &&
    STEP_TIMES.every(
      (k) =>
        Number.isInteger(next[k]) &&
        next[k] >= STEP_SECONDS_MIN &&
        next[k] <= STEP_SECONDS_MAX,
    ) &&
    (next.mode === "classic" || next.mode === "host") &&
    (impostors === null ||
      (Number.isInteger(impostors) &&
        (impostors as number) >= 1 &&
        (impostors as number) <= Math.floor(GAME_SEATS.impostor.max / 3))) &&
    (next.themeMode === "vote" || next.themeMode === "host") &&
    Array.isArray(offTastes) &&
    offTastes.every(isTaste) &&
    Array.isArray(offThemes) &&
    offThemes.length <= OFF_THEMES_MAX &&
    offThemes.every((id) => typeof id === "string" && THEME_ID.test(id)) &&
    inRange(next.coins, COINS) &&
    inRange(next.lotsPerSeat, LOTS_PER_SEAT) &&
    (rounds === null || inRange(rounds, ROUNDS)) &&
    typeof next.interval === "boolean" &&
    typeof next.trades === "boolean" &&
    typeof next.heavy === "boolean" &&
    typeof next.watchChat === "boolean" &&
    Array.isArray(offMissions) &&
    offMissions.length <= OFF_MISSIONS_MAX &&
    offMissions.every((id) => typeof id === "string" && THEME_ID.test(id));
  if (!ok) fail("invalid_input");
  // Each taste once, in the order the screens show them; one stays on.
  const off = TASTE_KEYS.filter((k) => (offTastes as string[]).includes(k));
  if (off.length === TASTE_KEYS.length) fail("invalid_input");
  // a room made before tastes carries its old theme sets: they go
  const { themeSets: _sets, ...rest } = next as RoomSettings & {
    themeSets?: unknown;
  };
  return {
    ...rest,
    name: next.name.trim(),
    // a public room keeps no password around
    password: next.visibility === "private" ? next.password.trim() : "",
    offTastes: off,
    offThemes: [...new Set(offThemes as string[])].sort(),
    offMissions: [...new Set(offMissions as string[])].sort(),
  };
}

// --- shared steps --------------------------------------------------------------

/**
 * A new round needs a theme: the host types it, or everyone votes on `themes`.
 * The opening plays first: the lobby leaves, the title scene, then the cold
 * open on "Who am I?"'s long matches (see longShows), then the vote or the
 * host's form comes in.
 */
function beginTheme(
  s: RoomState,
  themes: Theme[] | undefined,
  examples: (RuleExamples | null)[] | undefined,
  deals: ImpDeal[] | undefined,
  ctx: Ctx,
) {
  const T = SHOW_TIMING;
  // the cold open tells "Who am I?"'s rules; the Impostor's deal show tells its own
  const coldOpen = s.settings.game === "who-am-i" && longShows(s);
  const open: Part[] = [
    ["curtain", T.curtain],
    titlePart(s),
    ["intro", coldOpen ? T.intro : 0],
  ];
  // the Impostor always votes: its cards come with the themes
  if (s.settings.game === "impostor")
    return beginVote(
      s,
      themes,
      examples,
      [...open, ["entrance", T.entrance.vote]],
      ctx,
      deals ?? fail("invalid_input"),
    );
  if (s.settings.themeMode === "host")
    return beginTheming(
      s,
      themes,
      [...open, ["entrance", T.entrance.theming]],
      ctx,
    );
  beginVote(s, themes, examples, [...open, ["entrance", T.entrance.vote]], ctx);
}

/** The host types the theme; `ideas` help them. If the clock runs out, everyone votes instead. */
function beginTheming(
  s: RoomState,
  ideas: Theme[] | undefined,
  opening: Part[],
  ctx: Ctx,
) {
  s.ideas = (ideas ?? []).slice(0, THEME_IDEAS).map((t) => ({ ...t }));
  s.vote = null;
  s.theme = null;
  s.reveal = null;
  s.turnPlayerId = null;
  s.phase = "theming";
  stage(s, "opening", s.round + 1, longShows(s), opening, ctx);
  startStep(s, ctx, HOST_THEME_SECONDS * 1000);
}

/** Puts THEME_OPTIONS themes to the vote, once the opening is over; the match starts once the vote is. */
function beginVote(
  s: RoomState,
  themes: Theme[] | undefined,
  examples: (RuleExamples | null)[] | undefined,
  opening: Part[],
  ctx: Ctx,
  deals?: ImpDeal[],
) {
  if (!themes || themes.length !== THEME_OPTIONS) fail("invalid_input");
  if (examples && examples.length !== THEME_OPTIONS) fail("invalid_input");
  if (deals && deals.length !== THEME_OPTIONS) fail("invalid_input");
  s.vote = {
    options: (themes ?? []).map((t) => ({ ...t })),
    votes: {},
    cuts: {},
    chosen: null,
    tied: [],
    ...(examples ? { examples: structuredClone(examples) } : {}),
    ...(deals ? { deals: structuredClone(deals) } : {}),
  };
  s.ideas = [];
  s.theme = null;
  s.reveal = null;
  s.turnPlayerId = null;
  s.phase = "voting";
  stage(s, "opening", s.round + 1, longShows(s), opening, ctx);
  startStep(s, ctx, stepMs(s, "voteSeconds"));
}

/** Most votes wins; a tie (or nobody voting) is drawn. Then the match starts behind the theme show. */
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
  if (s.settings.game === "impostor") {
    const deal = v.deals?.[v.chosen] ?? fail("invalid_input");
    // the other themes' cards are never needed again
    delete v.deals;
    return beginImpostor(s, v.options[v.chosen], deal, v.tied.length > 1, ctx);
  }
  beginMatch(s, v.options[v.chosen], ctx);
  showTheme(
    s,
    {
      tie: v.tied.length > 1,
      typed: false,
      rule: v.examples?.[v.chosen] ?? null,
    },
    ctx,
  );
}

/**
 * The theme show: the vote's result (a tie spins first), the theme, the rule
 * (a long match), the draw and "you pick for…", then the pick table
 * comes in. Picking starts when it ends. Two players can only pick for each
 * other, so they skip the draw: "you pick for…" comes in on its own.
 */
function showTheme(
  s: RoomState,
  o: { tie: boolean; typed: boolean; rule: RuleExamples | null },
  ctx: Ctx,
) {
  const first = longShows(s);
  const v = first ? "first" : "later";
  const T = SHOW_TIMING;
  const rule = first
    ? o.rule && !o.typed
      ? T.rule.cards
      : T.rule.sentence
    : 0;
  const drawn = s.players.length > 2;
  stage(
    s,
    "theme",
    s.round,
    first,
    [
      ["tie_spin", o.tie ? T.tieSpin : 0],
      ["settle", o.typed ? 0 : T.settle[v]],
      ["theme", rule ? T.theme.withRule : T.theme.alone],
      ["rule", rule],
      ["draw", drawn ? T.draw[v] : 0],
      ["target", T.target[v] + (drawn ? 0 : T.targetLead)],
      ["entrance", T.entrance.pick],
    ],
    ctx,
    first ? (o.typed ? null : o.rule) : undefined,
  );
  startStep(s, ctx, PICK_SECONDS * 1000);
}

function setTheme(s: RoomState, playerId: PlayerId, text: string, ctx: Ctx) {
  if (s.phase !== "theming") fail("wrong_phase");
  requireSeated(s, playerId);
  if (playerId !== s.hostId) fail("not_host");
  const t = cleanText(text.replace(/\s+/g, " "), MAX_THEME);
  beginMatch(s, { en: t, es: t, ja: t, pt: t, set: null }, ctx);
  showTheme(s, { tie: false, typed: true, rule: null }, ctx);
}

const everyoneVoted = (s: RoomState) =>
  s.players.every((p) => s.vote?.votes[p.id] !== undefined);

function vote(s: RoomState, playerId: PlayerId, option: number, ctx: Ctx) {
  if (s.phase !== "voting") fail("wrong_phase");
  requireSeated(s, playerId);
  const v = s.vote ?? fail("wrong_phase");
  if (!Number.isInteger(option) || option < 0 || option >= v.options.length)
    fail("invalid_input");
  const first = v.votes[playerId] === undefined;
  v.votes[playerId] = option;
  if (everyoneVoted(s)) closeVote(s, ctx);
  // changing a vote cuts nothing
  else if (first) {
    const before = s.deadline;
    cutClock(s, ctx, "voteSeconds", s.players.length);
    if (before !== null && s.deadline !== null)
      v.cuts[playerId] = before - s.deadline;
  }
}

/** Takes a vote back: the time it took off the clock comes back. */
function unvote(s: RoomState, playerId: PlayerId) {
  if (s.phase !== "voting") fail("wrong_phase");
  requireSeated(s, playerId);
  const v = s.vote ?? fail("wrong_phase");
  if (v.votes[playerId] === undefined) return;
  delete v.votes[playerId];
  const back = v.cuts[playerId] ?? 0;
  delete v.cuts[playerId];
  if (s.deadline !== null) s.deadline += back;
}

/** Phases where leaving gives up the seat: no match is being played. */
const BEFORE_MATCH = new Set(["lobby", "theming", "voting", "finished"]);
/** The Impostor's steps, from the first question to the last guess. */
const IMP_PHASES = new Set(["replying", "talking", "last_chance"]);
const LUP = new Set<string>(LU_PHASES);
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
      {
        ...host,
        ready: true,
        joinedAt: ctx.now,
        strikes: 0,
        away: false,
        goneAt: null,
        colorSlot: pickColorSlot(
          [],
          host.avatar.color,
          GAME_SEATS[valid.game].max,
        ),
      },
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
    stepMs: null,
    reveal: null,
    round: 0,
    newcomer: false,
    turnRound: 0,
    turnNumber: 0,
    playStartedAt: null,
    imp: null,
    lu: null,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}

/** True when the current step's clock has run out and a TIMEOUT event is due. */
export function isExpired(state: RoomState, now: number): boolean {
  return state.deadline !== null && now >= state.deadline;
}

/** A closed lobby page frees the seat; a match only ends once every page is closed. */
function sweep(s: RoomState, ctx: Ctx) {
  if (!presenceDue(s, ctx.now)) fail("wrong_phase");
  if (s.phase === "lobby") {
    for (const p of s.players.filter((x) => goneFor(x, ctx.now)))
      leave(s, p.id, ctx);
    return;
  }
  s.phase = "closed";
  s.turnPlayerId = null;
  s.reveal = null;
  stopClock(s);
}

/** Applies one event. Returns a new state; throws GameError when the event is not allowed. */
export function reduce(
  state: RoomState,
  event: GameEvent,
  ctx: Ctx,
): RoomState {
  const s = structuredClone(state);
  apply(s, event, ctx);
  // someone leaving (or closing their page) may be all a waiting start still waited for
  if (s.starting && SETTLES_START.has(event.type)) settleStart(s, ctx);
  s.updatedAt = ctx.now;
  return s;
}

const SETTLES_START = new Set<GameEvent["type"]>([
  "LEAVE",
  "KICK",
  "GONE",
  "SWEEP",
]);

/** The host may start: in the lobby, with enough players. */
function checkStart(s: RoomState, playerId: PlayerId) {
  requireSeated(s, playerId);
  if (playerId !== s.hostId) fail("not_host");
  if (s.phase !== "lobby") fail("wrong_phase");
  if (s.players.length < GAME_SEATS[s.settings.game].min)
    fail(
      s.settings.game === "impostor"
        ? "need_three_players"
        : "need_two_players",
    );
}

/** The match begins with what the start brought. */
function begin(s: RoomState, e: StartFields, ctx: Ctx) {
  s.starting = null;
  stopClock(s);
  s.newcomer = e.newcomer === true;
  countMatch(s);
  // What for? has no theme: the cards and missions come with the start
  if (s.settings.game === "lineup")
    return beginLineup(s, e.decks ?? fail("invalid_input"), ctx);
  return beginTheme(s, e.themes, e.examples, e.deals, ctx);
}

/**
 * A waiting start begins once every page still open on the room is ready for
 * its opening, START_LEAD_MS ahead, so they all have it before the curtain;
 * with too few players left it is called off. The seats are closed while it
 * waits: whoever sat when it was asked plays, newcomers get the next match.
 */
function settleStart(s: RoomState, ctx: Ctx) {
  const w = s.starting;
  if (!w) return;
  if (s.players.length < GAME_SEATS[s.settings.game].min) {
    s.starting = null;
    return stopClock(s);
  }
  const open = s.players.filter((p) => p.goneAt == null && !p.away);
  if (open.every((p) => w.ready.includes(p.id)))
    begin(s, w.start, { ...ctx, now: ctx.now + START_LEAD_MS });
}

function apply(s: RoomState, e: GameEvent, ctx: Ctx) {
  switch (e.type) {
    case "JOIN":
      return join(s, e.player, e.password, ctx);
    case "LEAVE":
      return leave(s, e.playerId, ctx);
    case "GONE": {
      const p = requireSeated(s, e.playerId);
      if (s.phase === "closed" || p.goneAt != null) fail("already_done");
      p.goneAt = ctx.now;
      return;
    }
    case "BACK": {
      const p = requireSeated(s, e.playerId);
      if (p.goneAt == null) fail("already_done");
      p.goneAt = null;
      return;
    }
    case "SEEN": {
      requireSeated(s, e.playerId);
      if (s.phase === "closed") fail("wrong_phase");
      return;
    }
    case "SWEEP":
      return sweep(s, ctx);
    case "SET_READY": {
      // in the lobby, or at a match's end for the next one
      if (s.phase !== "lobby" && s.phase !== "finished") fail("wrong_phase");
      const p = requireSeated(s, e.playerId);
      if (p.id === s.hostId) fail("invalid_input");
      p.ready = e.ready;
      return;
    }
    case "KICK":
      return kick(s, e, ctx);
    case "SIT":
      return sit(s, e.playerId, e.player, e.at, ctx);
    case "STAND":
      return stand(s, e.playerId, e.targetId);
    case "SWAP_SEAT":
      return swapSeat(s, e.playerId, e.targetId, e.player, ctx);
    case "SWAP_SEATS":
      return swapSeats(s, e.playerId, e.a, e.b);
    case "MUTE":
      return mute(s, e.playerId, e.targetId, e.muted);
    case "TRANSFER_HOST":
      return transferHost(s, e.playerId, e.targetId);
    case "UPDATE_SETTINGS": {
      requireSeated(s, e.playerId);
      if (e.playerId !== s.hostId) fail("not_host");
      // a start already waiting was made for these settings
      if (s.phase !== "lobby" || s.starting) fail("wrong_phase");
      const game = s.settings.game;
      s.settings = mergeSettings(s.settings, e.settings, s.players.length);
      if (s.settings.game !== game) recolor(s);
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
      checkStart(s, e.playerId);
      const { type: _, ...start } = e;
      return begin(s, start, ctx);
    }
    case "PREPARE_START": {
      // the host's "one more" at a match's end: back to the lobby and straight into the start
      if (s.phase === "finished" && e.playerId === s.hostId) backToLobby(s);
      checkStart(s, e.playerId);
      if (s.starting) fail("already_done");
      if (s.settings.game === "lineup" && !e.decks) fail("invalid_input");
      const { type: _, ...start } = e;
      // every page, the host's too, says when it is ready
      s.starting = { until: ctx.now + START_WAIT_MS, ready: [], start };
      // its clock: the read after it starts the match regardless
      s.deadline = s.starting.until;
      return settleStart(s, ctx);
    }
    case "OPENING_READY": {
      const p = requireSeated(s, e.playerId);
      const w = s.phase === "lobby" ? s.starting : null;
      if (!w) return fail("wrong_phase");
      if (w.ready.includes(p.id)) fail("already_done");
      w.ready.push(p.id);
      return settleStart(s, ctx);
    }
    case "VOTE":
      return vote(s, e.playerId, e.option, ctx);
    case "UNVOTE":
      return unvote(s, e.playerId);
    case "SET_THEME":
      return setTheme(s, e.playerId, e.text, ctx);
    case "DRAFT":
      return draft(s, e.playerId, e.draft, ctx);
    case "PICK":
      return pick(s, e.playerId, e.character, e.suggested === true, ctx);
    case "ASK":
      return ask(s, e.playerId, e.text, ctx);
    case "ANSWER":
      return answer(s, e.playerId, e.value, e.note, ctx);
    case "GUESS":
      return guess(s, e.playerId, e.text, ctx);
    case "PASS":
      return passGuess(s, e.playerId, ctx);
    case "VALIDATE":
      return validate(s, e.playerId, e.correct, ctx);
    case "GIVE_UP":
      return giveUp(s, e.playerId, ctx);
    case "REPLY":
      return reply(s, e.playerId, e.answer, ctx);
    case "UNREPLY":
      return unreply(s, e.playerId, ctx);
    case "POINT":
      return point(s, e.playerId, e.targetId);
    case "ACCUSE":
      return accuse(s, e.playerId, e.targetId, ctx);
    case "UNACCUSE":
      return unaccuse(s, e.playerId, ctx);
    case "DONT_KNOW":
      return dontKnow(s, e.playerId, ctx);
    case "LAST_GUESS":
      return lastGuess(s, e.playerId, e.text, ctx);
    case "BID":
      return bid(s, e.playerId, e.amount, ctx);
    case "FOLD":
      return fold(s, e.playerId, ctx);
    case "DONE":
      return markDone(s, e.playerId, e.done, ctx);
    case "OFFER":
      return offer(s, e.playerId, { to: e.to, give: e.give, get: e.get }, ctx);
    case "CANCEL_OFFER":
      return cancelOffer(s, e.playerId, ctx);
    case "ANSWER_OFFER":
      return answerOffer(s, e.playerId, e.from, e.accept, ctx);
    case "BOARD":
      return saveBoard(s, e.playerId, e.board, ctx);
    case "PRESENTED":
      return presented(s, e.playerId, ctx);
    case "REACT":
      return react(s, e.playerId, e.board, e.counts, ctx);
    case "JUDGE":
      return judge(s, e.playerId, e.ownerId, ctx);
    case "RATE":
      return rate(s, e.playerId, e.up);
    case "CHAIR":
      return sitChair(s, e.playerId, e.seat);
    case "DRAW_CHAIR":
      return drawChair(s, e.playerId, ctx);
    case "MISSION":
      return chooseMission(s, e.playerId, e.pick, e.text, ctx);
    case "QUEUE":
      return setQueue(s, e.playerId, e.cards, ctx);
    case "CUE":
      return luCue(s, e.playerId, e.kind, ctx);
    case "HUNCH":
      return hunch(s, e.playerId, e.text);
    case "VERDICT":
      return giveVerdict(s, e.playerId, e.ownerId, e.why, e.final, ctx);
    case "BACK_TO_LOBBY": {
      // anyone seated takes the room back from a match's end; the host may bring another game
      requireSeated(s, e.playerId);
      if (s.phase !== "finished") fail("wrong_phase");
      if (e.game !== undefined && e.playerId !== s.hostId) fail("not_host");
      backToLobby(s);
      if (e.game === undefined || e.game === s.settings.game) return;
      s.settings = mergeSettings(
        s.settings,
        { game: e.game },
        s.players.length,
      );
      return recolor(s);
    }
    case "TIMEOUT":
      return timeout(s, e, ctx);
  }
}

/** A game with fewer colours: whoever holds one beyond them gets a free one it has. */
function recolor(s: RoomState) {
  const slots = GAME_SEATS[s.settings.game].max;
  const held = s.players.filter((p) => p.colorSlot < slots);
  for (const p of s.players) {
    if (p.colorSlot < slots) continue;
    p.colorSlot = pickColorSlot(
      held.map((x) => x.colorSlot),
      p.avatar.color,
      slots,
    );
    held.push(p);
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
  if (s.muted) s.muted = s.muted.map(swap);
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
  if (s.starting) {
    s.starting.ready = s.starting.ready.map(swap);
    s.starting.start.playerId = swap(s.starting.start.playerId);
  }
  for (const m of s.matches ?? [])
    for (const p of m.players) if (p.id === from) p.id = to;
  if (s.imp) swapImpostor(s.imp, swap);
  if (s.lu) swapLineup(s.lu, swap);
}

/** What for?'s traces of a player under their new id. */
function swapLineup(
  lu: NonNullable<RoomState["lu"]>,
  swap: (id: PlayerId) => PlayerId,
) {
  const keys = <T>(r: Record<PlayerId, T>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [swap(k), v]));
  const pairs = (r: Record<PlayerId, PlayerId>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [swap(k), swap(v)]));
  lu.dealt = lu.dealt.map(swap);
  lu.coins = keys(lu.coins);
  lu.bids = keys(lu.bids);
  lu.passed = lu.passed.map(swap);
  lu.done = lu.done.map(swap);
  lu.cuts = keys(lu.cuts);
  for (const o of lu.offers) {
    o.from = swap(o.from);
    o.to = swap(o.to);
  }
  for (const r of lu.rounds) {
    r.hands = keys(r.hands);
    for (const tag of Object.values(r.tags)) if (tag.by) tag.by = swap(tag.by);
    r.change = keys(r.change);
    for (const t of r.trades) {
      t.from = swap(t.from);
      t.to = swap(t.to);
    }
    r.boards = keys(r.boards);
    r.order = r.order.map(swap);
    r.reactions = Object.fromEntries(
      Object.entries(r.reactions).map(([k, v]) => [swap(k), keys(v)]),
    );
    r.votes = pairs(r.votes);
    if (r.tie) {
      r.tie.among = r.tie.among.map(swap);
      r.tie.voters = r.tie.voters.map(swap);
      r.tie.votes = pairs(r.tie.votes);
    }
    r.winners = r.winners.map(swap);
    if (r.crowd) r.crowd = swap(r.crowd);
    r.points = keys(r.points);
    r.rated = keys(r.rated);
  }
}

/** The Impostor's traces of a player under their new id. */
function swapImpostor(
  imp: NonNullable<RoomState["imp"]>,
  swap: (id: PlayerId) => PlayerId,
) {
  const keys = <T>(r: Record<PlayerId, T>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [swap(k), v]));
  imp.dealt = imp.dealt.map(swap);
  imp.impostors = imp.impostors.map(swap);
  for (const a of imp.asked) {
    a.answers = keys(a.answers);
    a.cuts = keys(a.cuts);
  }
  if (imp.vote) {
    imp.vote.points = Object.fromEntries(
      Object.entries(imp.vote.points).map(([k, v]) => [swap(k), swap(v)]),
    );
    imp.vote.votes = Object.fromEntries(
      Object.entries(imp.vote.votes).map(([k, v]) => [swap(k), swap(v)]),
    );
    imp.vote.cuts = keys(imp.vote.cuts);
  }
  for (const o of imp.outs) {
    o.id = swap(o.id);
    o.by = o.by.map(swap);
  }
  if (imp.guessing) imp.guessing = swap(imp.guessing);
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
  checkKicked(s, player.id, ctx.now);
  // a waiting start already fixed who plays: newcomers wait for the next match
  if (s.phase !== "lobby" || s.starting) fail("already_started");
  if (s.players.length >= s.settings.seats) fail("room_full");
  // Only newcomers are asked: whoever already has a seat comes back freely.
  checkLock(s, password);
  s.players.push(seatFor(s, player, ctx));
}

function checkKicked(s: RoomState, id: PlayerId, now: number) {
  const until = s.kicked?.[id] ?? 0;
  if (until > now) fail(until - now > KICK_MS ? "banned" : "kicked");
}

function checkLock(s: RoomState, password: string | undefined) {
  const lock = s.settings.visibility === "private" ? s.settings.password : "";
  if (!lock) return;
  if (!password?.trim()) fail("password_required");
  if (password?.trim() !== lock) fail("wrong_password");
}

/**
 * May `player` come in to watch (no seat)? The same door as a seat, without
 * the seats: an open room, not kicked out, the password of a private one.
 * Throws GameError otherwise. The server keeps watchers outside RoomState.
 */
export function admitWatcher(
  s: RoomState,
  player: PlayerId,
  password: string | undefined,
  now: number,
) {
  if (s.phase === "closed") fail("not_found");
  checkKicked(s, player, now);
  checkLock(s, password);
}

/** A new seat for `player`, with a colour nobody here holds. */
function seatFor(
  s: RoomState,
  player: Identity,
  ctx: Ctx,
  taken = s.players.map((p) => p.colorSlot),
) {
  return {
    ...player,
    ready: false,
    joinedAt: ctx.now,
    strikes: 0,
    away: false,
    goneAt: null,
    colorSlot: pickColorSlot(
      taken,
      player.avatar.color,
      GAME_SEATS[s.settings.game].max,
    ),
  };
}

/** The host may move people around: in the lobby, before a start waits. */
function checkSeating(s: RoomState, playerId: PlayerId) {
  requireSeated(s, playerId);
  if (playerId !== s.hostId) fail("not_host");
  if (s.phase !== "lobby" || s.starting) fail("wrong_phase");
}

/**
 * The host takes someone out: a player out of the lobby, or someone watching
 * at any point of the match. They can't come back for KICK_MS, or BAN_MS
 * when banned.
 */
function kick(s: RoomState, e: Extract<GameEvent, { type: "KICK" }>, ctx: Ctx) {
  const { playerId: hostId, targetId } = e;
  requireSeated(s, hostId);
  if (hostId !== s.hostId) fail("not_host");
  if (targetId === hostId) fail("invalid_input");
  const seat = findPlayer(s, targetId);
  if (seat) {
    if (s.phase !== "lobby") fail("wrong_phase");
    s.players = s.players.filter((p) => p.id !== targetId);
    if (s.chair === targetId) {
      s.chair = null;
      delete s.chairDrawn;
    }
  } else if (!e.watcher) fail("not_member");
  else if (s.phase === "closed") fail("wrong_phase");
  const kicked = Object.entries(s.kicked ?? {}).filter(
    ([, until]) => until > ctx.now,
  );
  s.kicked = Object.fromEntries([
    ...kicked,
    [targetId, ctx.now + (e.ban ? BAN_MS : KICK_MS)],
  ]);
  if (s.players.length < 2) stopClock(s);
}

/** Someone watching takes a free seat (`at`: where, else the last one). */
function sit(
  s: RoomState,
  playerId: PlayerId,
  player: Identity,
  at: number | undefined,
  ctx: Ctx,
) {
  if (playerId === player.id) {
    if (s.phase !== "lobby" || s.starting) fail("wrong_phase");
  } else checkSeating(s, playerId);
  if (findPlayer(s, player.id)) fail("already_done");
  checkKicked(s, player.id, ctx.now);
  if (s.players.length >= s.settings.seats) fail("room_full");
  const i =
    at === undefined
      ? s.players.length
      : Math.max(0, Math.min(Math.trunc(at), s.players.length));
  s.players.splice(i, 0, seatFor(s, player, ctx));
}

/** A player gets up to watch: never the host, who hands the room over first. */
function stand(s: RoomState, playerId: PlayerId, targetId: PlayerId) {
  if (playerId === targetId) {
    requireSeated(s, playerId);
    if (s.phase !== "lobby" || s.starting) fail("wrong_phase");
  } else checkSeating(s, playerId);
  requireSeated(s, targetId);
  if (targetId === s.hostId) fail("invalid_input");
  s.players = s.players.filter((p) => p.id !== targetId);
  if (s.chair === targetId) {
    s.chair = null;
    delete s.chairDrawn;
  }
}

/** The host seats someone watching in `targetId`'s place; `targetId` watches. */
function swapSeat(
  s: RoomState,
  hostId: PlayerId,
  targetId: PlayerId,
  player: Identity,
  ctx: Ctx,
) {
  checkSeating(s, hostId);
  const i = s.players.findIndex((p) => p.id === targetId);
  if (i < 0) fail("not_member");
  if (targetId === s.hostId) fail("invalid_input");
  if (findPlayer(s, player.id)) fail("already_done");
  checkKicked(s, player.id, ctx.now);
  const taken = s.players.filter((p) => p.id !== targetId);
  s.players[i] = seatFor(
    s,
    player,
    ctx,
    taken.map((p) => p.colorSlot),
  );
  if (s.chair === targetId) {
    s.chair = null;
    delete s.chairDrawn;
  }
}

/** The host has two players trade places. */
function swapSeats(s: RoomState, hostId: PlayerId, a: PlayerId, b: PlayerId) {
  checkSeating(s, hostId);
  const i = s.players.findIndex((p) => p.id === a);
  const j = s.players.findIndex((p) => p.id === b);
  if (i < 0 || j < 0) fail("not_member");
  if (i === j) fail("invalid_input");
  [s.players[i], s.players[j]] = [s.players[j], s.players[i]];
}

/** The host silences someone in the chat, or lets them talk again. */
function mute(
  s: RoomState,
  hostId: PlayerId,
  targetId: PlayerId,
  muted: boolean,
) {
  requireSeated(s, hostId);
  if (hostId !== s.hostId) fail("not_host");
  if (s.phase === "closed") fail("wrong_phase");
  if (targetId === hostId) fail("invalid_input");
  const rest = (s.muted ?? []).filter((id) => id !== targetId);
  s.muted = muted ? [...rest, targetId] : rest;
}

/** The host hands the room to someone else here: they take over, ready like any host. */
function transferHost(s: RoomState, hostId: PlayerId, targetId: PlayerId) {
  const old = requireSeated(s, hostId);
  if (hostId !== s.hostId) fail("not_host");
  if (s.phase !== "lobby") fail("wrong_phase");
  if (targetId === hostId) fail("invalid_input");
  const target = requireSeated(s, targetId);
  if (!isPresent(target)) fail("invalid_input");
  s.hostId = targetId;
  target.ready = true;
  old.ready = false;
  // the host is never silenced
  if (s.muted) s.muted = s.muted.filter((id) => id !== targetId);
}

/**
 * What for?'s TV chair, in the lobby: anyone sits in it when it's empty and
 * gets up from it; the host seats anyone there or empties it. Being the host
 * and presenting are apart: handing the room over leaves the chair as it is.
 */
function sitChair(s: RoomState, playerId: PlayerId, seat: PlayerId | null) {
  requireSeated(s, playerId);
  if (s.phase !== "lobby") fail("wrong_phase");
  const host = playerId === s.hostId;
  const chair = s.chair ?? null;
  delete s.chairDrawn;
  if (seat === null) {
    if (!host && chair !== playerId) fail("not_host");
    s.chair = null;
    return;
  }
  requireSeated(s, seat);
  if (!host && (seat !== playerId || (chair !== null && chair !== playerId)))
    fail("not_host");
  s.chair = seat;
}

/** The host draws the TV chair among the people here (enough for a presenter). */
function drawChair(s: RoomState, playerId: PlayerId, ctx: Ctx) {
  requireSeated(s, playerId);
  if (s.phase !== "lobby") fail("wrong_phase");
  if (playerId !== s.hostId) fail("not_host");
  const here = s.players.filter(isPresent).map((p) => p.id);
  if (here.length < HOST_MIN_PEOPLE) fail("invalid_input");
  s.chair = here[Math.floor(ctx.random() * here.length)];
  s.chairDrawn = true;
}

function leave(s: RoomState, id: PlayerId, ctx: Ctx) {
  const p = requireSeated(s, id);
  if (s.phase === "closed") fail("wrong_phase");
  if (BEFORE_MATCH.has(s.phase)) {
    s.players = s.players.filter((x) => x.id !== id);
    if (s.chair === id) {
      s.chair = null;
      delete s.chairDrawn;
    }
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
      // the opening must not play again over the lobby
      s.reveal = null;
      stopClock(s);
      return;
    }
    if (s.phase === "voting" && everyoneVoted(s)) closeVote(s, ctx);
    return;
  }
  // mid-match: keep the seat so the history still makes sense
  p.away = true;
  handOverHost(s);
  if (IMP_PHASES.has(s.phase)) return impLeft(s, id, ctx);
  if (LUP.has(s.phase)) return luLeft(s, id, ctx);
  whoLeft(s, id, ctx);
}

/**
 * From a match's end to a fresh lobby: whoever left the match loses their
 * seat, and who said at the end they were ready for the next one stays ready.
 * The vote stays, so the next one avoids its themes.
 */
function backToLobby(s: RoomState) {
  s.players = s.players.filter(isPresent);
  if (s.players.length === 0) {
    s.phase = "closed";
    return stopClock(s);
  }
  handOverHost(s);
  for (const p of s.players) {
    if (p.id === s.hostId) p.ready = true;
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
  s.imp = null;
  s.lu = null;
  stopClock(s);
}

function timeout(
  s: RoomState,
  e: Extract<GameEvent, { type: "TIMEOUT" }>,
  ctx: Ctx,
) {
  if (!isExpired(s, ctx.now)) fail("wrong_phase");
  switch (s.phase) {
    case "lobby": {
      // a start that waited long enough begins, whoever is not ready yet
      const w = s.starting;
      if (w && s.players.length >= GAME_SEATS[s.settings.game].min)
        return begin(s, w.start, { ...ctx, now: ctx.now + START_LEAD_MS });
      // too few left, or a room saved while lobbies still had a clock
      s.starting = null;
      return stopClock(s);
    }
    case "theming":
      // the host's opening already played: just the vote coming in
      return beginVote(
        s,
        e.themes,
        e.examples,
        [["entrance", SHOW_TIMING.entrance.vote]],
        ctx,
      );
    case "voting":
      return closeVote(s, ctx);
    case "finished":
      return backToLobby(s);
    case "picking":
    case "asking":
    case "answering":
    case "guessing":
    case "validating":
      return whoTimeout(s, e, ctx);
    case "replying":
    case "talking":
    case "last_chance":
      return impTimeout(s, ctx);
    default:
      return LUP.has(s.phase) ? luTimeout(s, ctx) : fail("wrong_phase");
  }
}
