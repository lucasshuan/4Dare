// Small lookups shared by the engine and the view.
import { SEAT_COLORS } from "./seat-colors";
import {
  DEFAULT_SETTINGS,
  GONE_GRACE_MS,
  type Play,
  type PlayerId,
  type RoomPlayer,
  type RoomSettings,
  type RoomState,
  type StepTime,
} from "./types";

export const isPresent = (p: RoomPlayer) => !p.away;

/** A step's seconds; rooms saved before the setting existed get its default. */
export function stepSeconds(settings: RoomSettings, key: StepTime): number {
  return settings[key] ?? DEFAULT_SETTINGS[key];
}

export function isActive(state: RoomState, id: PlayerId): boolean {
  const o = state.outcomes[id];
  return !o || (o.discoveredAt === null && !o.gaveUp);
}

/** A player's colour (0-based); rooms saved before colours were kept go by seat. */
export const colorSlotOf = (state: RoomState, p: RoomPlayer) =>
  p.colorSlot ?? state.players.indexOf(p) % SEAT_COLORS;

export function findPlayer(state: RoomState, id: PlayerId) {
  return state.players.find((p) => p.id === id);
}

/** The turn under way: its question and guess carry this number. Older rooms count plays. */
export const turnNumber = (state: RoomState) =>
  state.turnNumber ?? state.plays.length + 1;

export function openQuestion(state: RoomState) {
  const last = state.plays.at(-1);
  return last?.kind === "question" && last.open ? last : null;
}

export function pendingGuess(state: RoomState) {
  const last = state.plays.at(-1);
  return last?.kind === "guess" && last.result === "pending" ? last : null;
}

/** The latest resolved question asked by `by` (the one a guess follows). */
export function lastQuestionBy(state: RoomState, by: PlayerId) {
  for (let i = state.plays.length - 1; i >= 0; i--) {
    const p: Play = state.plays[i];
    if (p.kind === "question" && p.by === by && !p.open) return p;
  }
  return null;
}

/** Whoever picked the guesser's character; if they left, the next present player after the guesser. */
export function validatorOf(state: RoomState, guesserId: PlayerId) {
  const picker = state.assignments[guesserId]?.pickerId;
  const pickerPlayer = picker ? findPlayer(state, picker) : undefined;
  if (pickerPlayer && isPresent(pickerPlayer) && picker !== guesserId) {
    return pickerPlayer.id;
  }
  const order = state.order;
  const start = order.indexOf(guesserId);
  for (let k = 1; k < order.length; k++) {
    const id = order[(start + k) % order.length];
    const p = findPlayer(state, id);
    if (p && isPresent(p) && id !== guesserId) return id;
  }
  return null;
}

/** Their page has been closed for longer than a reload takes. */
export const goneFor = (p: Pick<RoomPlayer, "goneAt">, now: number) =>
  p.goneAt != null && now - p.goneAt >= GONE_GRACE_MS;

/**
 * Everyone still playing closed their page a while ago: nobody is left to
 * wait for. A lobby only counts its own seats; a match skips who left it.
 */
export function abandoned(state: RoomState, now: number): boolean {
  if (state.phase === "closed") return false;
  const here = state.players.filter((p) => !p.away);
  return here.length > 0 && here.every((p) => goneFor(p, now));
}

/** True when a SWEEP has something to do: a lobby seat to free, or a room to close. */
export function presenceDue(state: RoomState, now: number): boolean {
  if (state.phase === "lobby")
    return state.players.some((p) => goneFor(p, now));
  return abandoned(state, now);
}
