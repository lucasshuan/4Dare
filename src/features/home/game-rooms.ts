import type { GameKey } from "@/game/games";
import type { Lang, PublicRoom } from "@/game/types";

/**
 * A game page's rooms: the game's rooms in the page's language (their host's),
 * and among them the ones with a free seat, the oldest first, so the rooms
 * waiting longest fill up first.
 */
export function gameRooms(rooms: PublicRoom[], game: GameKey, lang: Lang) {
  const mine = rooms.filter((r) => r.game === game && r.host.lang === lang);
  const open = mine
    .filter((r) => r.status === "open")
    .sort((a, b) => a.createdAt - b.createdAt);
  return { mine, open };
}
