import "server-only";
import type { RoomState } from "@/game/types";
import { toPublicRoom } from "@/game/view";
import type { RoomStore } from "../types";
import { serviceClient } from "./clients";

const UNIQUE_VIOLATION = "23505";

export function supabaseRooms(): RoomStore {
  const db = () => serviceClient().from("rooms");
  return {
    async get(code) {
      const { data, error } = await db()
        .select("state, version")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      return data
        ? { state: data.state as RoomState, version: data.version as number }
        : null;
    },
    async create(state) {
      const { error } = await db().insert({
        code: state.code,
        state,
        version: 1,
        phase: state.phase,
        visibility: state.settings.visibility,
      });
      if (error?.code === UNIQUE_VIOLATION) return false;
      if (error) throw error;
      return true;
    },
    /** One conditional UPDATE: only lands if nobody wrote since we read. */
    async compareAndSwap(code, expectedVersion, next) {
      const { data, error } = await db()
        .update({
          state: next,
          version: expectedVersion + 1,
          phase: next.phase,
          visibility: next.settings.visibility,
          updated_at: new Date().toISOString(),
        })
        .eq("code", code)
        .eq("version", expectedVersion)
        .select("code");
      if (error) throw error;
      return (data?.length ?? 0) === 1;
    },
    async listPublic() {
      const { data, error } = await db()
        .select("state")
        .in("phase", [
          "lobby",
          "picking",
          "asking",
          "answering",
          "guessing",
          "validating",
        ])
        .eq("visibility", "public")
        .gte("updated_at", new Date(Date.now() - 20 * 60_000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).flatMap((r) => {
        const room = toPublicRoom(r.state as RoomState, now);
        return room ? [room] : [];
      });
    },
  };
}
