import "server-only";
import type { ChatMessage, ChatPerson, SystemLine } from "@/game/chat";
import { GameError } from "@/game/types";
import type { ChatStore } from "../types";
import { json, serviceClient } from "./clients";
import type { Database } from "./database.types";

/** A row of room_messages (supabase/migrations/0012_room_messages.sql). */
interface Row {
  id: number | string;
  created_at: string;
  show_at: string;
  author_id: string | null;
  author: ChatPerson | null;
  body: string | null;
  system: SystemLine | null;
}

const COLUMNS = "id, created_at, show_at, author_id, author, body, system";

const toMessage = (r: Row): ChatMessage => ({
  id: Number(r.id),
  at: Date.parse(r.created_at),
  showAt: Date.parse(r.show_at),
  by: r.author_id,
  author: r.author,
  text: r.body,
  system: r.system,
});

const iso = (ms: number) => new Date(ms).toISOString();

type AddArgs = Database["public"]["Functions"]["add_room_message"]["Args"];
/** add_room_message takes nulls (a system line has no author or body); generated types can't tell. */
type AddArgsOrNull = { [K in keyof AddArgs]: AddArgs[K] | null };

/**
 * Supabase: written and read by the server only (service key). Inserts go
 * through add_room_message, which holds the per-author limit across every
 * server instance; the route's in-memory check is only a cheap first line.
 */
export function supabaseChat(): ChatStore {
  const db = () => serviceClient().from("room_messages");
  return {
    async add(code, items) {
      const saved: ChatMessage[] = [];
      // in order: identity ids follow the inserts
      for (const item of items) {
        const text = "text" in item;
        const args: AddArgsOrNull = {
          p_room: code,
          p_author: text ? item.by : null,
          p_author_json: text ? json(item.author) : null,
          p_body: text ? item.text : null,
          p_system: text ? null : json(item.system),
          p_show_at: item.showAt === undefined ? null : iso(item.showAt),
        };
        const { data, error } = await serviceClient().rpc(
          "add_room_message",
          args as AddArgs,
        );
        if (error?.message?.includes("rate_limited"))
          throw new GameError("rate_limited");
        if (error) throw error;
        const row = (Array.isArray(data) ? data[0] : data) as Row | null;
        if (!row) throw new Error("add_room_message returned nothing");
        saved.push(toMessage(row));
      }
      return saved;
    },
    async list(code, since, limit) {
      const { data, error } = await db()
        .select(COLUMNS)
        .eq("room_code", code)
        .gte("created_at", iso(since))
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return ((data ?? []) as Row[]).map(toMessage).sort((a, b) => a.id - b.id);
    },
    async clear(code) {
      const { error } = await db().delete().eq("room_code", code);
      if (error) throw error;
    },
    async prune(before) {
      const { error } = await db().delete().lt("created_at", iso(before));
      if (error) throw error;
    },
    async reassign(from, to) {
      const { error } = await serviceClient().rpc("reassign_room_messages", {
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
    },
  };
}
