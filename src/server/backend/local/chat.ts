import "server-only";
import { CHAT_LIMITS, type ChatMessage, reassignMessage } from "@/game/chat";
import { GameError } from "@/game/types";
import type { ChatStore } from "../types";
import { processSingleton } from "./disk";

/** Lines kept per room. */
const KEEP = 200;

/**
 * Local mode: in memory, like local rooms (a restart clears it). One process,
 * so the per-author limit checked here is exact.
 */
export function localChat(): ChatStore {
  const rooms = processSingleton(
    "room-chat",
    () => new Map<string, ChatMessage[]>(),
  );
  const ids = processSingleton("room-chat-ids", () => ({ last: 0 }));
  return {
    async add(code, items) {
      const now = Date.now();
      const kept = rooms.get(code) ?? [];
      const saved: ChatMessage[] = [];
      for (const item of items) {
        if ("text" in item) {
          for (const { max, windowMs } of CHAT_LIMITS) {
            const recent = kept.filter(
              (m) =>
                m.by === item.by && m.text !== null && now - m.at < windowMs,
            ).length;
            if (recent >= max) throw new GameError("rate_limited");
          }
        }
        const base = { id: ++ids.last, at: now, showAt: item.showAt ?? now };
        const message: ChatMessage =
          "text" in item
            ? {
                ...base,
                by: item.by,
                author: structuredClone(item.author),
                text: item.text,
                system: null,
              }
            : {
                ...base,
                by: null,
                author: null,
                text: null,
                system: structuredClone(item.system),
              };
        kept.push(message);
        saved.push(message);
      }
      rooms.set(code, kept.slice(-KEEP));
      return structuredClone(saved);
    },
    async list(code, since, limit) {
      const lines = (rooms.get(code) ?? []).filter((m) => m.at >= since);
      return structuredClone(lines.slice(-limit));
    },
    async clear(code) {
      rooms.delete(code);
    },
    async prune(before) {
      for (const [code, lines] of rooms) {
        const kept = lines.filter((m) => m.at >= before);
        if (kept.length) rooms.set(code, kept);
        else rooms.delete(code);
      }
    },
    async reassign(from, to) {
      for (const [code, lines] of rooms)
        rooms.set(
          code,
          lines.map((m) => reassignMessage(m, from, to)),
        );
    },
  };
}
