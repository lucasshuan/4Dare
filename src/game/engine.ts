// The rules. Pure functions: same input, same output; no clock, no randomness, no I/O of their own.
// CONTRACT: these signatures are fixed; the bodies are the engine's job.
import type {
  Ctx,
  GameEvent,
  Identity,
  RoomSettings,
  RoomState,
} from "./types";

/** A brand-new room in the lobby, with the host seated. */
export function createRoom(
  _code: string,
  _host: Identity,
  _settings: RoomSettings,
  _ctx: Ctx,
): RoomState {
  throw new Error("not implemented");
}

/** Applies one event. Returns a new state; throws GameError when the event is not allowed. */
export function reduce(
  _state: RoomState,
  _event: GameEvent,
  _ctx: Ctx,
): RoomState {
  throw new Error("not implemented");
}

/** True when the current step's clock has run out and a TIMEOUT event is due. */
export function isExpired(_state: RoomState, _now: number): boolean {
  throw new Error("not implemented");
}
