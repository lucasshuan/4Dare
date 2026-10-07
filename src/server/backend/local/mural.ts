import "server-only";
import { GameError } from "@/game/types";
import type { MuralStore, StoredComment } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

const FILE = "mural.json";
/** As post_profile_comment: lines per author per minute and per day. */
const PER_MINUTE = 8;
const PER_DAY = 60;
const HIDE_AT = 3;

interface Kept {
  next: number;
  comments: StoredComment[];
  /** "comment|reporter" */
  reports: string[];
}

/** Local mode: the murals in one JSON file under .data/. */
export function localMural(): MuralStore {
  const kept = processSingleton("mural", () =>
    readJson<Kept>(FILE, { next: 1, comments: [], reports: [] }),
  );
  const save = () => writeJson(FILE, kept);
  const newestFirst = (a: StoredComment, b: StoredComment) =>
    b.createdAt - a.createdAt || b.id - a.id;
  return {
    async page(profileId, before, limit) {
      const lines = kept.comments
        .filter(
          (c) =>
            c.profileId === profileId &&
            c.parentId === null &&
            (before === null || c.createdAt < before),
        )
        .sort(newestFirst);
      const shown = lines.slice(0, limit);
      const ids = new Set(shown.map((l) => l.id));
      return {
        lines: shown,
        replies: kept.comments
          .filter((c) => c.parentId !== null && ids.has(c.parentId))
          .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id),
        more: lines.length > limit,
      };
    },
    async get(id) {
      return kept.comments.find((c) => c.id === id) ?? null;
    },
    async post({ profileId, authorId, parentId, body }) {
      if (
        parentId !== null &&
        !kept.comments.some(
          (c) =>
            c.id === parentId &&
            c.profileId === profileId &&
            c.parentId === null,
        )
      )
        throw new GameError("invalid_input");
      const now = Date.now();
      const mine = kept.comments.filter((c) => c.authorId === authorId);
      if (
        mine.filter((c) => c.createdAt > now - 60_000).length >= PER_MINUTE ||
        mine.filter((c) => c.createdAt > now - 86_400_000).length >= PER_DAY
      )
        return null;
      const id = kept.next++;
      kept.comments.push({
        id,
        profileId,
        authorId,
        parentId,
        body,
        hidden: false,
        createdAt: now,
      });
      save();
      return id;
    },
    async remove(id) {
      kept.comments = kept.comments.filter(
        (c) => c.id !== id && c.parentId !== id,
      );
      save();
    },
    async report(id, reporterId) {
      const key = `${id}|${reporterId}`;
      if (!kept.reports.includes(key)) kept.reports.push(key);
      const line = kept.comments.find((c) => c.id === id);
      if (!line) return false;
      if (kept.reports.filter((r) => r.startsWith(`${id}|`)).length >= HIDE_AT)
        line.hidden = true;
      save();
      return line.hidden;
    },
  };
}
