// Players the lab makes up: given the room and a seat, what that seat does now
// (null: nothing to do). They play like a quick, careless person: a vote at
// random, any character, a short question, a guess that is often wrong. Pure:
// the same room and the same draws give the same move. A move the engine turns
// down is just skipped (the lab tries each seat once per step).
import { findPlayer } from "../helpers";
import type { GameEvent, PlayerId, RoomState } from "../types";
import { impostorMove } from "./impostor";
import { type BotKit, type BotRandom, pick } from "./kit";
import { lineupMove } from "./lineup";
import { whoMove } from "./who-am-i";

/** What `seat` does now in room `s`, or null. */
export function botMove(
  s: RoomState,
  seat: PlayerId,
  random: BotRandom,
  kit: BotKit,
): GameEvent | null {
  const me = findPlayer(s, seat);
  if (!me) return null;
  if (s.phase === "lobby")
    return me.ready || seat === s.hostId
      ? null
      : { type: "SET_READY", playerId: seat, ready: true };
  if (s.phase === "voting" && s.vote)
    return {
      type: "VOTE",
      playerId: seat,
      option: pick(random, s.vote.options.length),
    };
  if (s.phase === "theming")
    return seat === s.hostId
      ? { type: "SET_THEME", playerId: seat, text: kit.typedTheme }
      : null;
  if (s.settings.game === "impostor") return impostorMove(s, seat, random);
  if (s.settings.game === "lineup") return lineupMove(s, seat, random);
  return whoMove(s, seat, random, kit);
}

export type { BotKit, BotRandom } from "./kit";
