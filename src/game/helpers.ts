// Small lookups shared by the engine and the view.
import type { Play, PlayerId, RoomPlayer, RoomState } from "./types";

export const isPresent = (p: RoomPlayer) => !p.away;

export function isActive(state: RoomState, id: PlayerId): boolean {
  const o = state.outcomes[id];
  return !o || (o.discoveredAt === null && !o.gaveUp);
}

export function findPlayer(state: RoomState, id: PlayerId) {
  return state.players.find((p) => p.id === id);
}

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
