import "server-only";
import type { BadgeStore } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

const FILE = "badges.json";

/** Local mode: { userId: { "matches.silver": ms } } in .data/badges.json. */
export function localBadges(): BadgeStore {
  const kept = processSingleton("badges", () =>
    readJson<Record<string, Record<string, number>>>(FILE, {}),
  );
  return {
    async earned(userId) {
      return new Map(Object.entries(kept[userId] ?? {}));
    },
    async grant(userId, tiers) {
      const mine = kept[userId] ?? {};
      const now = Date.now();
      let changed = false;
      for (const { key } of tiers) {
        if (mine[key] !== undefined) continue;
        mine[key] = now;
        changed = true;
      }
      if (!changed) return;
      kept[userId] = mine;
      writeJson(FILE, kept);
    },
  };
}
