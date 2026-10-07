import "server-only";
import { DEFAULT_GAME, type GameKey } from "@/game/games";
import type { ActiveRoom, Phase, RoomState } from "@/game/types";
import { upgradeRoom } from "@/game/upgrade";
import { toPublicRoom } from "@/game/view";
import { LISTED_COLUMNS } from "../../listing";
import type { RoomStore } from "../types";
import { json, serviceClient } from "./clients";

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
        ? {
            state: upgradeRoom(data.state as unknown as RoomState),
            version: data.version,
          }
        : null;
    },
    async create(state) {
      const { error } = await db().insert({
        code: state.code,
        state: json(state),
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
          state: json(next),
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
      // only what the list shows, never each room's history
      const { data, error } = await db()
        .select(LISTED_COLUMNS)
        .in("phase", [
          "lobby",
          "voting",
          "picking",
          "asking",
          "answering",
          "guessing",
          "validating",
          "replying",
          "talking",
          "last_chance",
        ])
        .gte("updated_at", new Date(Date.now() - 20 * 60_000).toISOString())
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).flatMap((r) => {
        const room = toPublicRoom(upgradeRoom(r as unknown as RoomState), now);
        return room ? [room] : [];
      });
    },
    async listActive(since) {
      // only the fields counting needs, not each room's whole history
      const { data, error } = await db()
        .select(
          "phase, updated_at, game:state->settings->>game, players:state->players",
        )
        .neq("phase", "closed")
        .gte("updated_at", new Date(since).toISOString())
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map(
        (r): ActiveRoom => ({
          game: ((r.game as string | null) ?? DEFAULT_GAME) as GameKey,
          phase: r.phase as Phase,
          updatedAt: new Date(r.updated_at as string).getTime(),
          players: (r.players as ActiveRoom["players"] | null) ?? [],
        }),
      );
    },
    async withPlayer(playerId, phases) {
      const { data, error } = await db()
        .select("code")
        .in("phase", [...phases])
        // jsonb containment: some seat has this id
        .filter("state->players", "cs", JSON.stringify([{ id: playerId }]))
        .gte("updated_at", new Date(Date.now() - 6 * 3600_000).toISOString())
        .limit(10);
      if (error) throw error;
      return (data ?? []).map((r) => r.code as string);
    },
  };
}
