import "server-only";
import { DEFAULT_GAME } from "@/game/games";
import type { ActiveRoom, ListedRoom, RoomState } from "@/game/types";
import { toPublicRoom } from "@/game/view";
import type { RoomStore, StoredRoom } from "../types";
import { processSingleton } from "./disk";

/** Rooms live in memory: they only matter while people are playing. */
export function localRooms(): RoomStore {
  const rooms = processSingleton("rooms", () => new Map<string, StoredRoom>());
  return {
    async get(code) {
      const r = rooms.get(code);
      return r ? structuredClone(r) : null;
    },
    async create(state) {
      if (rooms.has(state.code)) return false;
      rooms.set(state.code, { state: structuredClone(state), version: 1 });
      return true;
    },
    async compareAndSwap(code, expectedVersion, next) {
      const r = rooms.get(code);
      if (!r || r.version !== expectedVersion) return false;
      rooms.set(code, { state: structuredClone(next), version: r.version + 1 });
      return true;
    },
    async listPublic() {
      const now = Date.now();
      const list: { at: number; room: ListedRoom }[] = [];
      for (const { state } of rooms.values()) {
        const room = toPublicRoom(state as RoomState, now);
        if (room) list.push({ at: state.createdAt, room });
      }
      return list
        .sort((a, b) => b.at - a.at)
        .map((x) => x.room)
        .slice(0, 100);
    },
    async listActive(since) {
      const list: ActiveRoom[] = [];
      for (const { state } of rooms.values()) {
        if (state.phase === "closed" || state.updatedAt < since) continue;
        list.push({
          game: state.settings.game ?? DEFAULT_GAME,
          phase: state.phase,
          updatedAt: state.updatedAt,
          players: state.players,
        });
      }
      return list;
    },
    async withPlayer(playerId, phases) {
      return [...rooms.values()]
        .filter(
          ({ state }) =>
            phases.includes(state.phase) &&
            state.players.some((p) => p.id === playerId),
        )
        .map(({ state }) => state.code);
    },
  };
}
