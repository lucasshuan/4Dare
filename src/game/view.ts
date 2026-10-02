// What each player is allowed to see. This is the only place that decides secrecy.
import {
  findPlayer,
  isPresent,
  lastQuestionBy,
  openQuestion,
  pendingGuess,
  validatorOf,
} from "./helpers";
import {
  type AnswerEntry,
  type CardView,
  type Character,
  GameError,
  type HistoryEntryView,
  type Phase,
  type PickView,
  type PlayerId,
  type PlayerStatus,
  type PlayerView,
  type PublicRoom,
  type RevealView,
  type RoomPlayer,
  type RoomState,
  type RoomView,
  type TurnView,
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
    n: s.plays.length + 1,
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

function pick(s: RoomState, viewer: PlayerId): PickView | null {
  if (s.phase !== "picking") return null;
  const target = Object.keys(s.assignments).find(
    (t) => s.assignments[t].pickerId === viewer,
  );
  if (!target) return null;
  const a = s.assignments[target];
  return {
    targetId: target,
    confirmed: !!a.character,
    character: toCard(a.character),
    confirmedIds: Object.values(s.assignments)
      .filter((x) => x.character)
      .map((x) => x.pickerId),
    total: s.players.length,
  };
}

function reveal(
  s: RoomState,
  viewer: PlayerId,
  now: number,
): RevealView | null {
  const r = s.reveal;
  if (!r || now >= r.until) return null;
  const play = s.plays.find((p) => p.n === r.n);
  if (!play) return null;
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
      startsAt: r.startsAt,
      until: r.until,
    };
  }
  return null;
}

/** The room as `viewerId` may see it. Throws GameError("not_member") for outsiders. */
export function toView(
  state: RoomState,
  version: number,
  viewerId: PlayerId,
  now: number,
): RoomView {
  const s = state;
  if (!findPlayer(s, viewerId)) throw new GameError("not_member");
  const pickedOpen = CARDS_OPEN.includes(s.phase);

  const players: PlayerView[] = s.players.map((p) => {
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
      isTurn: TURN.includes(s.phase) && p.id === s.turnPlayerId,
      card,
      cardHidden: isYou && inMatch && !visible,
      pickedById:
        pickedOpen && (!isYou || s.phase === "finished")
          ? (s.assignments[p.id]?.pickerId ?? null)
          : null,
      discoveredAt: o?.discoveredAt ?? null,
      place: o?.place ?? null,
      gaveUp: o?.gaveUp ?? false,
      away: p.away,
    };
  });

  return {
    code: s.code,
    phase: s.phase,
    settings: s.settings,
    round: s.round,
    version,
    youId: viewerId,
    hostId: s.hostId,
    players,
    theme: s.theme,
    deadline: s.deadline,
    stepStartsAt: s.stepStartsAt,
    reveal: reveal(s, viewerId, now),
    serverNow: now,
    pick: pick(s, viewerId),
    turn: turn(s, viewerId),
    history: history(s),
    canStart:
      viewerId === s.hostId && s.phase === "lobby" && s.players.length >= 2,
  };
}

/** A match nobody has touched for this long is not shown as being played. */
const PLAYING_FRESH_MS = 20 * 60_000;
const PLAYING_PHASES = new Set([
  "picking",
  "asking",
  "answering",
  "guessing",
  "validating",
]);

/** The home-screen summary, or null when the room should not be listed. */
export function toPublicRoom(state: RoomState, now: number): PublicRoom | null {
  const s = state;
  const host = findPlayer(s, s.hostId);
  if (s.settings.visibility !== "public" || !host) return null;
  let status: PublicRoom["status"];
  if (s.phase === "lobby") {
    if (s.deadline !== null && now >= s.deadline) return null;
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
    stepSeconds: s.settings.stepSeconds,
  };
}
