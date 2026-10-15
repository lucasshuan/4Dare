import "server-only";
import { playingNow } from "@/game/engine";
import type { GameKey } from "@/game/games";
import { adminOnly } from "@/server/auth/roles";
import { getBackend } from "../backend";

export interface AdminRoom {
  code: string;
  name: string;
  game: GameKey;
  status: "lobby" | "playing";
  since: number;
  updatedAt: number;
  players: number;
}

/** The rooms open now: lobby or in a match (the vote counts), and for how long. */
export async function adminRooms(): Promise<AdminRoom[]> {
  await adminOnly();
  const list = await getBackend().rooms.listActive(0);
  return list
    .map((r) => ({
      code: r.code,
      name: r.name ?? "",
      game: r.game,
      status: playingNow(r.phase) ? ("playing" as const) : ("lobby" as const),
      since: r.since ?? r.updatedAt,
      updatedAt: r.updatedAt,
      players: r.players.filter((p) => !p.goneAt).length,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Closes the rooms left with nothing happening; how many. */
export async function closeIdleRooms(): Promise<number> {
  const me = await adminOnly();
  const { admin } = getBackend();
  const n = await admin.closeIdle();
  await admin
    .audit({
      actor: me.id,
      action: "rooms.close-idle",
      target: "rooms",
      after: n,
    })
    .catch(() => {});
  return n;
}
