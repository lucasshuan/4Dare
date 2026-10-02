import "server-only";
import type { PublicRoom, RoomState } from "@/game/types";
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
      const list: { at: number; room: PublicRoom }[] = [];
      for (const { state } of rooms.values()) {
        const room = toPublicRoom(state as RoomState, now);
        if (room) list.push({ at: state.createdAt, room });
      }
      return list.sort((a, b) => b.at - a.at).map((x) => x.room);
    },
  };
}
