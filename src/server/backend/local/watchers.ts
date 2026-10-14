import "server-only";
import { GONE_GRACE_MS, WATCH_STALE_MS } from "@/game/types";
import type { StoredWatcher, WatcherStore } from "../types";
import { processSingleton } from "./disk";

/** A watcher still there: page open (or closed within the grace) and seen lately. */
const fresh = (w: StoredWatcher, now: number) =>
  now - w.seenAt < WATCH_STALE_MS &&
  (w.goneAt === null || now - w.goneAt < GONE_GRACE_MS);

/** Local mode: in memory, like local rooms. */
export function localWatchers(): WatcherStore {
  const rows = processSingleton(
    "room-watchers",
    () => new Map<string, StoredWatcher>(),
  );
  const inRoom = (code: string) =>
    [...rows.values()].filter((w) => w.room === code);
  return {
    async get(playerId) {
      const w = rows.get(playerId);
      return w ? structuredClone(w) : null;
    },
    async add(code, person) {
      const now = Date.now();
      const had = rows.get(person.id);
      const position =
        had?.room === code
          ? had.position
          : Math.max(0, ...inRoom(code).map((w) => w.position)) + 1;
      const w: StoredWatcher = {
        room: code,
        person: structuredClone(person),
        position,
        seenAt: now,
        goneAt: null,
      };
      rows.set(person.id, w);
      return structuredClone(w);
    },
    async remove(playerId, code) {
      if (rows.get(playerId)?.room !== code) return false;
      rows.delete(playerId);
      return true;
    },
    async touch(playerId, code, gone) {
      const w = rows.get(playerId);
      if (w?.room !== code) return;
      const now = Date.now();
      w.seenAt = now;
      w.goneAt = gone ? now : null;
    },
    async list(code, limit, now) {
      const here = inRoom(code)
        .filter((w) => fresh(w, now))
        .sort((a, b) => a.position - b.position);
      return {
        total: here.length,
        watchers: structuredClone(here.slice(0, limit)),
      };
    },
    async move(playerId, code, position) {
      const w = rows.get(playerId);
      if (w?.room === code) w.position = position;
    },
    async rename(person) {
      const w = rows.get(person.id);
      if (w) w.person = structuredClone(person);
    },
    async reassign(from, to) {
      const w = rows.get(from);
      if (!w) return;
      rows.delete(from);
      rows.set(to.id, { ...w, person: structuredClone(to) });
    },
    async prune(before) {
      for (const [id, w] of rows) if (w.seenAt < before) rows.delete(id);
    },
    async counts(codes, now) {
      const out: Record<string, number> = {};
      for (const w of rows.values())
        if (codes.includes(w.room) && fresh(w, now))
          out[w.room] = (out[w.room] ?? 0) + 1;
      return out;
    },
  };
}
