// What each player is allowed to see. This is the only place that decides secrecy.

import type { GameKey } from "./games";
import { DEFAULT_GAME } from "./games";
import {
  abandoned,
  colorSlotOf,
  findPlayer,
  goneFor,
  isPresent,
  lastQuestionBy,
  openQuestion,
  pendingGuess,
  presenceDue,
  stepSeconds,
  turnNumber,
  validatorOf,
} from "./helpers";
import {
  type ActiveRoom,
  type AnswerEntry,
  type CardView,
  type Character,
  DEFAULT_SETTINGS,
  GameError,
  GONE_GRACE_MS,
  type HistoryEntryView,
  LOBBY_LISTED_MS,
  type Phase,
  type PickView,
  type PlayerId,
  type PlayerStatus,
  type PlayerView,
  type PublicRoom,
  type Reveal,
  type RevealView,
  type RoomPlayer,
  type RoomSettings,
  type RoomState,
  type RoomView,
  type ShowKind,
  type ShowView,
  type TurnView,
  type VoteView,
} from "./types";

const TURN: Phase[] = ["asking", "answering", "guessing", "validating"];
const CARDS_OPEN: Phase[] = [...TURN, "finished"];

const toCard = (c: Character | null): CardView | null =>
  c
    ? {
        characterId: c.id,
        name: c.name,
        origin: c.origin,
        imageUrl: c.imageUrl,
      }
    : null;

const answersOf = (q: { answers: AnswerEntry[] }) =>
  q.answers.map((a) => ({ byId: a.by, value: a.value, note: a.note }));

/** May `viewer` see the character `owner` has to discover? */
function canSeeCard(s: RoomState, viewer: PlayerId, owner: PlayerId) {
  if (!CARDS_OPEN.includes(s.phase)) return false;
  if (viewer !== owner) return true;
  const o = s.outcomes[owner];
  return s.phase === "finished" || o?.discoveredAt != null || !!o?.gaveUp;
}

/** Someone who still has something to do right now. */
function mustAct(s: RoomState, id: PlayerId) {
  if (s.phase === "answering") {
    const q = openQuestion(s);
    const p = findPlayer(s, id);
    return (
      !!q &&
      !!p &&
      isPresent(p) &&
      q.by !== id &&
      !q.answers.some((a) => a.by === id)
    );
  }
  if (s.phase === "validating") {
    const g = pendingGuess(s);
    return !!g && validatorOf(s, g.by) === id;
  }
  return false;
}

function statusOf(s: RoomState, p: RoomPlayer): PlayerStatus {
  const o = s.outcomes[p.id];
  if (s.phase === "lobby")
    return p.id === s.hostId ? "host" : p.ready ? "ready" : "not_ready";
  if (s.phase === "theming") return p.id === s.hostId ? "theming" : "waiting";
  if (s.phase === "voting")
    return s.vote?.votes[p.id] !== undefined ? "voted" : "voting";
  if (s.phase === "picking") {
    const done = Object.values(s.assignments).some(
      (a) => a.pickerId === p.id && a.character,
    );
    if (o?.gaveUp) return "gave_up";
    return done ? "picked" : "picking";
  }
  if (s.phase === "finished" || s.phase === "closed") {
    if (o?.discoveredAt != null) return "discovered";
    return o?.gaveUp ? "gave_up" : "waiting";
  }
  const acting = mustAct(s, p.id);
  if (!acting && o?.gaveUp) return "gave_up";
  if (!acting && o?.discoveredAt != null) return "discovered";
  const isTurn = p.id === s.turnPlayerId;
  switch (s.phase) {
    case "asking":
      return isTurn ? "asking" : "will_answer";
    case "answering": {
      if (isTurn) return "waiting";
      const q = openQuestion(s);
      return q?.answers.some((a) => a.by === p.id) ? "answered" : "answering";
    }
    case "guessing":
      return isTurn ? "guessing" : "waiting";
    default:
      return acting ? "validating" : "waiting";
  }
}

function history(s: RoomState): HistoryEntryView[] {
  const out: HistoryEntryView[] = [];
  for (const p of s.plays) {
    if (p.kind === "question" && !p.open) {
      out.push({
        n: p.n,
        kind: "question",
        byId: p.by,
        text: p.text,
        answers: answersOf(p),
      });
    } else if (p.kind === "guess" && p.result !== "pending") {
      out.push({
        n: p.n,
        kind: "guess",
        byId: p.by,
        text: p.text,
        result: p.result,
      });
    }
  }
  return out;
}

function turn(s: RoomState, viewer: PlayerId): TurnView | null {
  if (!TURN.includes(s.phase) || !s.turnPlayerId) return null;
  const base: TurnView = {
    n: turnNumber(s),
    playerId: s.turnPlayerId,
    question: null,
    answeredIds: [],
    yourAnswer: null,
    answers: null,
    guess: null,
    validatorId: null,
  };
  if (s.phase === "answering") {
    const q = openQuestion(s);
    if (!q) return base;
    const mine = q.answers.find((a) => a.by === viewer);
    return {
      ...base,
      n: q.n,
      question: q.text,
      answeredIds: q.answers.map((a) => a.by),
      yourAnswer: mine ? { value: mine.value, note: mine.note } : null,
    };
  }
  const q = lastQuestionBy(s, s.turnPlayerId);
  if (s.phase === "guessing" && q) {
    return { ...base, n: q.n, question: q.text, answers: answersOf(q) };
  }
  if (s.phase === "validating") {
    const g = pendingGuess(s);
    if (!g) return base;
    return {
      ...base,
      n: g.n,
      guess: g.text,
      validatorId: validatorOf(s, g.by),
      question: q?.text ?? null,
      answers: q ? answersOf(q) : null,
    };
  }
  return base;
}

/** Your card and the table, while picking and while the cast that follows plays (it opens on the table). */
function pick(s: RoomState, viewer: PlayerId, now: number): PickView | null {
  const casting = s.reveal?.kind === "cast" && now < s.reveal.until;
  if (s.phase !== "picking" && !casting) return null;
  const target = Object.keys(s.assignments).find(
    (t) => s.assignments[t].pickerId === viewer,
  );
  if (!target) return null;
  const a = s.assignments[target];
  // the draft only ever goes to its picker: this is their own card
  const d = a.character ? null : a.draft;
  return {
    targetId: target,
    confirmed: !!a.character,
    character: toCard(a.character),
    confirmedIds: Object.values(s.assignments)
      .filter((x) => x.character)
      .map((x) => x.pickerId),
    total: s.players.length,
    draft: d
      ? { characterId: d.characterId, name: d.name, imageUrl: d.imageUrl }
      : null,
  };
}

/**
 * The theme vote, while it runs and while the theme show plays its result out,
 * also when the cast already waits behind it (every card confirmed early).
 */
function voteView(
  s: RoomState,
  viewer: PlayerId,
  now: number,
): VoteView | null {
  const v = s.vote;
  const r = s.reveal;
  const show =
    r?.kind === "theme" ? r : r?.prev?.kind === "theme" ? r.prev : null;
  const revealing = !!show && now < show.until;
  if (!v || (s.phase !== "voting" && !revealing)) return null;
  const seated = new Set(s.players.map((p) => p.id));
  return {
    options: v.options,
    votes: Object.entries(v.votes)
      .filter(([id]) => seated.has(id))
      .map(([byId, option]) => ({ byId, option })),
    yourVote: v.votes[viewer] ?? null,
    chosen: v.chosen,
    tied: v.tied,
    total: s.players.length,
  };
}

/** Someone else discovered in the same turn round and shares `id`'s place. */
function isTied(s: RoomState, id: PlayerId) {
  const place = s.outcomes[id]?.place;
  return (
    place != null &&
    Object.entries(s.outcomes).some(
      ([other, o]) => other !== id && o.place === place,
    )
  );
}

const isShowKind = (kind: Reveal["kind"]): kind is ShowKind =>
  kind === "opening" || kind === "theme" || kind === "cast";

/**
 * A show as the screens get it, with the show still playing before it while
 * that lasts. A theme reveal saved before shows existed is one "theme" beat.
 */
function showView(r: Reveal, kind: ShowKind, now: number): ShowView {
  const prev = r.prev;
  return {
    kind,
    n: r.n,
    startsAt: r.startsAt,
    until: r.until,
    beats: r.beats
      ? r.beats.map((b) => ({ ...b }))
      : [{ kind: "theme", startsAt: r.startsAt, until: r.until }],
    first: r.first ?? false,
    rule: r.rule ?? null,
    prev:
      prev && isShowKind(prev.kind) && now < prev.until
        ? showView({ ...prev, prev: null }, prev.kind, now)
        : null,
  };
}

function reveal(
  s: RoomState,
  viewer: PlayerId,
  now: number,
): RevealView | null {
  const r = s.reveal;
  if (!r || now >= r.until) return null;
  if (isShowKind(r.kind)) return showView(r, r.kind, now);
  // A turn's question and guess share its number; a pass is told by its question.
  const kind = r.kind === "guess" ? "guess" : "question";
  const play = s.plays.find((p) => p.n === r.n && p.kind === kind);
  if (!play) return null;
  if (r.kind === "pass" && play.kind === "question")
    return {
      kind: "pass",
      n: play.n,
      byId: play.by,
      startsAt: r.startsAt,
      until: r.until,
    };
  if (r.kind === "answers" && play.kind === "question") {
    return {
      kind: "answers",
      n: play.n,
      byId: play.by,
      question: play.text,
      answers: answersOf(play),
      startsAt: r.startsAt,
      until: r.until,
    };
  }
  if (
    r.kind === "guess" &&
    play.kind === "guess" &&
    play.result !== "pending"
  ) {
    const hidden = viewer === play.by && play.result === "miss";
    return {
      kind: "guess",
      n: play.n,
      byId: play.by,
      guess: play.text,
      result: play.result,
      card: hidden ? null : toCard(s.assignments[play.by]?.character ?? null),
      place:
        play.result === "hit" ? (s.outcomes[play.by]?.place ?? null) : null,
      tied: play.result === "hit" && isTied(s, play.by),
      startsAt: r.startsAt,
      until: r.until,
    };
  }
  return null;
}

/** The room as `viewerId` may see it. Throws GameError("not_member") for outsiders. */
/** Settings minus keys older rooms still carry (one "stepSeconds" became three times). */
function withoutLegacy(settings: RoomSettings) {
  const { stepSeconds: _old, ...rest } = settings as RoomSettings & {
    stepSeconds?: number;
  };
  return rest;
}

export function toView(
  state: RoomState,
  version: number,
  viewerId: PlayerId,
  now: number,
): RoomView {
  const s = state;
  if (!findPlayer(s, viewerId)) throw new GameError("not_member");
  // Who picks for whom is open from picking on (the ring and the turn order give it away anyway).
  const pickedOpen = s.phase === "picking" || CARDS_OPEN.includes(s.phase);

  const players: PlayerView[] = s.players.map((p, seat) => {
    const o = s.outcomes[p.id];
    const isYou = p.id === viewerId;
    const visible = canSeeCard(s, viewerId, p.id);
    const card = visible
      ? toCard(s.assignments[p.id]?.character ?? null)
      : null;
    const inMatch = s.phase !== "lobby" && s.phase !== "closed";
    return {
      id: p.id,
      isYou,
      isHost: p.id === s.hostId,
      isGuest: p.isGuest,
      name: p.name,
      guestNumber: p.guestNumber,
      avatar: p.avatar,
      ready: p.ready,
      status: statusOf(s, p),
      seat,
      colorSlot: colorSlotOf(s, p),
      turnOrder:
        inMatch && s.order.includes(p.id) ? s.order.indexOf(p.id) : null,
      isTurn: TURN.includes(s.phase) && p.id === s.turnPlayerId,
      card,
      cardHidden: isYou && inMatch && !visible,
      pickedById: pickedOpen ? (s.assignments[p.id]?.pickerId ?? null) : null,
      discoveredAt: o?.discoveredAt ?? null,
      place: o?.place ?? null,
      gaveUp: o?.gaveUp ?? false,
      away: p.away,
    };
  });

  return {
    code: s.code,
    phase: s.phase,
    // Rooms saved before a setting existed show its default.
    // The password only goes to the host, who shares it.
    settings: {
      ...DEFAULT_SETTINGS,
      ...withoutLegacy(s.settings),
      password: viewerId === s.hostId ? (s.settings.password ?? "") : "",
    },
    round: s.round,
    version,
    youId: viewerId,
    hostId: s.hostId,
    players,
    theme: s.theme,
    deadline: s.deadline,
    stepStartsAt: s.stepStartsAt,
    stepMs:
      s.stepMs ??
      (s.deadline !== null && s.stepStartsAt !== null
        ? s.deadline - s.stepStartsAt
        : null),
    sweepAt: sweepAt(s),
    reveal: reveal(s, viewerId, now),
    serverNow: now,
    vote: voteView(s, viewerId, now),
    ideas:
      s.phase === "theming" && viewerId === s.hostId ? (s.ideas ?? []) : null,
    pick: pick(s, viewerId, now),
    turn: turn(s, viewerId),
    history: history(s),
    turns: s.turnNumber ?? s.plays.length,
    canStart:
      viewerId === s.hostId && s.phase === "lobby" && s.players.length >= 2,
  };
}

/** A match nobody has touched for this long is not shown as being played. */
const PLAYING_FRESH_MS = 20 * 60_000;
const PLAYING_PHASES = new Set([
  "theming",
  "voting",
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
]);

/**
 * Players with a room page open right now, per game: in a lobby, a match or
 * on the podium. Who left a match or closed the page doesn't count; neither
 * does a room the room list would leave out for being idle too long.
 */
export function playersOnline(
  rooms: ActiveRoom[],
  now: number,
): Partial<Record<GameKey, number>> {
  const counts: Partial<Record<GameKey, number>> = {};
  for (const r of rooms) {
    const idle = now - r.updatedAt;
    if (r.phase === "closed" || idle >= PLAYING_FRESH_MS) continue;
    if (r.phase === "lobby" && idle >= LOBBY_LISTED_MS) continue;
    const here = r.players.filter((p) => !p.away && !goneFor(p, now)).length;
    counts[r.game] = (counts[r.game] ?? 0) + here;
  }
  return counts;
}

/**
 * The first moment a closed page's grace ends with something to settle (a
 * lobby seat to free, a room nobody is left in), or null. Viewers refetch
 * then, and that read applies it.
 */
function sweepAt(s: RoomState): number | null {
  const gone = s.players.flatMap((p) => (p.goneAt != null ? [p.goneAt] : []));
  if (!gone.length) return null;
  const at = Math.min(...gone) + GONE_GRACE_MS;
  return presenceDue(s, at) ? at : null;
}

/**
 * The room list's summary, or null when the room should not be listed. Private
 * rooms are listed too, locked; older private rooms without a password stay hidden.
 */
export function toPublicRoom(state: RoomState, now: number): PublicRoom | null {
  const s = state;
  const host = findPlayer(s, s.hostId);
  const locked = s.settings.visibility === "private";
  if (!host || (locked && !s.settings.password)) return null;
  // every page closed: as good as closed, even before anyone sweeps it
  if (abandoned(s, now)) return null;
  let status: PublicRoom["status"];
  if (s.phase === "lobby") {
    // Every page in the lobby closed: off the list at once. The seats wait out
    // GONE_GRACE_MS for a reload, but nobody should find the room meanwhile.
    if (s.players.every((p) => p.goneAt != null)) return null;
    if (now - s.updatedAt >= LOBBY_LISTED_MS) return null;
    status = s.players.length < s.settings.seats ? "open" : "full";
  } else if (
    PLAYING_PHASES.has(s.phase) &&
    now - s.updatedAt < PLAYING_FRESH_MS
  ) {
    status = "playing";
  } else {
    return null;
  }
  return {
    code: s.code,
    game: s.settings.game ?? DEFAULT_GAME,
    name: s.settings.name ?? "",
    locked,
    status,
    host: {
      isGuest: host.isGuest,
      name: host.name,
      guestNumber: host.guestNumber,
      avatar: host.avatar,
      lang: host.lang,
    },
    players: s.players.length,
    seats: s.settings.seats,
    voteSeconds: stepSeconds(s.settings, "voteSeconds"),
    askSeconds: stepSeconds(s.settings, "askSeconds"),
    guessSeconds: stepSeconds(s.settings, "guessSeconds"),
    answerSeconds: stepSeconds(s.settings, "answerSeconds"),
    validateSeconds: stepSeconds(s.settings, "validateSeconds"),
  };
}
