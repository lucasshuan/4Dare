// What each player is allowed to see. This is the only place that decides secrecy.
// CONTRACT: these signatures are fixed; the bodies are the engine's job.
import type { PlayerId, PublicRoom, RoomState, RoomView } from "./types";

/** The room as `viewerId` may see it. Throws GameError("not_member") for outsiders. */
export function toView(
  _state: RoomState,
  _version: number,
  _viewerId: PlayerId,
  _now: number,
): RoomView {
  throw new Error("not implemented");
}

/** The home-screen summary, or null when the room should not be listed. */
export function toPublicRoom(
  _state: RoomState,
  _now: number,
): PublicRoom | null {
  throw new Error("not implemented");
}
