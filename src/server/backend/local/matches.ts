import "server-only";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { MatchRecord } from "@/game/record";
import {
  type PickFeedback,
  tallyFeedback,
  tallyPicks,
  topPicks,
} from "../../theme-picks";
import type { MatchStore } from "../types";
import { dataPath, processSingleton, readJson, writeJson } from "./disk";

/** Verdicts on random draws: { "theme|character|user": liked }. */
const FEEDBACK_FILE = "pick-feedback.json";

/** Local mode: one JSON line per finished match, appended to .data/matches.jsonl. */
export function localMatches(): MatchStore {
  const path = dataPath("matches.jsonl");
  const read = (): MatchRecord[] => {
    try {
      return readFileSync(/* turbopackIgnore: true */ path, "utf8")
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
  const picks = processSingleton("theme-picks", () => tallyPicks(read()));
  const answers = processSingleton(
    "pick-feedback",
    () =>
      new Map(
        Object.entries(readJson<Record<string, boolean>>(FEEDBACK_FILE, {})),
      ),
  );
  const feedback = (): PickFeedback[] =>
    [...answers].map(([key, liked]) => {
      const [themeId, characterId, userId] = key.split("|");
      return { themeId, characterId, userId, liked };
    });

  return {
    async record(match) {
      if (saved.has(match.id)) return;
      mkdirSync(/* turbopackIgnore: true */ dirname(path), { recursive: true });
      appendFileSync(
        /* turbopackIgnore: true */ path,
        `${JSON.stringify(match)}\n`,
      );
      saved.add(match.id);
      tallyPicks([match], picks);
    },
    async played(userIds) {
      const all = new Set(
        read().flatMap((m) => m.players.map((p) => p.userId)),
      );
      return new Set(userIds.filter((id) => all.has(id)));
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
      writeFileSync(
        /* turbopackIgnore: true */ tmp,
        all.map((m) => `${JSON.stringify(m)}\n`).join(""),
      );
      renameSync(/* turbopackIgnore: true */ tmp, path);
    },
    async popularPicks(themeId, limit) {
      const verdicts = tallyFeedback(feedback()).get(themeId);
      return topPicks(picks.get(themeId), limit).map((p) => ({
        ...p,
        ...(verdicts?.get(p.id) ?? { likes: 0, dislikes: 0 }),
      }));
    },
    async rateDraw(f) {
      answers.set(`${f.themeId}|${f.characterId}|${f.userId}`, f.liked);
      writeJson(FEEDBACK_FILE, Object.fromEntries(answers));
    },
  };
}
