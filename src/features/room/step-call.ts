import type { PlayerStatus } from "@/game/types";

/** A turn's steps that wait on a player: their question, their answer, their guess, the check of a guess on the card they picked. */
const TURN_CALLS = new Set<PlayerStatus>([
  "asking",
  "answering",
  "guessing",
  "validating",
]);

/**
 * The turn step calling on this player, once it has started (a show or a
 * guess's scene may hold it), as a key that changes with each step; null
 * while they only watch. The step sound plays when it turns to a new key.
 */
export function stepCall(
  status: PlayerStatus,
  stepStartsAt: number | null,
  started: boolean,
): string | null {
  return started && TURN_CALLS.has(status)
    ? `${status} ${stepStartsAt ?? ""}`
    : null;
}
