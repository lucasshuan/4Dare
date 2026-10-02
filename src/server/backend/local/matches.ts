import "server-only";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { MatchRecord } from "@/game/record";
import type { MatchStore } from "../types";
import { DATA_DIR, processSingleton } from "./disk";

/** Local mode: one JSON line per finished match, appended to .data/matches.jsonl. */
export function localMatches(): MatchStore {
  const path = join(DATA_DIR, "matches.jsonl");
  const read = (): MatchRecord[] => {
    try {
      return readFileSync(path, "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as MatchRecord);
    } catch {
      return [];
    }
  };
  const saved = processSingleton(
    "saved-matches",
    () => new Set(read().map((m) => m.id)),
  );

  return {
    async record(match) {
      if (saved.has(match.id)) return;
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, `${JSON.stringify(match)}\n`);
      saved.add(match.id);
    },
    async reassign(fromUserId, toUserId) {
      const all = read();
      let changed = false;
      for (const match of all) {
        // Never two rows for the same person in one match.
        if (match.players.some((p) => p.userId === toUserId)) continue;
        for (const p of match.players) {
          if (p.userId !== fromUserId) continue;
          p.userId = toUserId;
          changed = true;
        }
      }
      if (!changed) return;
      const tmp = `${path}.tmp`;
      writeFileSync(tmp, all.map((m) => `${JSON.stringify(m)}\n`).join(""));
      renameSync(tmp, path);
    },
  };
}
