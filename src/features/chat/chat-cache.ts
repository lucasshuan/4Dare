// The chat's React Query entry, without React: what useChat keeps under
// ["chat", code], and how to build one from saved lines (the stage lab seeds
// its demo chat this way).
import type { ShownLine } from "@/game/chat";

/** A line you sent, shown at once until the server's copy replaces it. */
export interface Outgoing {
  id: number;
  text: string;
  at: number;
  failed: boolean;
}

export interface ChatCache {
  byId: Map<number, ShownLine>;
  outbox: Outgoing[];
}

export const chatKey = (code: string) => ["chat", code] as const;

export const EMPTY: ChatCache = { byId: new Map(), outbox: [] };

/** A cache holding these saved lines and nothing on its way. */
export const chatCache = (lines: ShownLine[]): ChatCache => ({
  byId: new Map(lines.map((m) => [m.id, m])),
  outbox: [],
});
