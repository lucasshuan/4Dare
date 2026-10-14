import "server-only";
import { GONE_GRACE_MS, type Identity, WATCH_STALE_MS } from "@/game/types";
import type { StoredWatcher, WatcherStore } from "../types";
import { json, serviceClient } from "./clients";

/** A row of room_watchers (supabase/migrations/0050_watchers_and_reports.sql). */
interface Row {
  room_code: string;
  person: Identity;
  position: number;
  seen_at: string;
  gone_at: string | null;
}

const COLUMNS = "room_code, person, position, seen_at, gone_at";

const toWatcher = (r: Row): StoredWatcher => ({
  room: r.room_code,
  person: r.person,
  position: Number(r.position),
  seenAt: Date.parse(r.seen_at),
  goneAt: r.gone_at === null ? null : Date.parse(r.gone_at),
});

const iso = (ms: number) => new Date(ms).toISOString();

/** Supabase: written and read by the server only (service key). */
export function supabaseWatchers(): WatcherStore {
  const db = () => serviceClient().from("room_watchers");
  const get = async (playerId: string) => {
    const { data, error } = await db()
      .select(COLUMNS)
      .eq("player_id", playerId)
      .maybeSingle();
    if (error) throw error;
    return data ? toWatcher(data as unknown as Row) : null;
  };
  const add = async (code: string, person: Identity) => {
    const [had, last] = await Promise.all([
      get(person.id),
      db()
        .select("position")
        .eq("room_code", code)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (last.error) throw last.error;
    const position =
      had?.room === code ? had.position : Number(last.data?.position ?? 0) + 1;
    const now = iso(Date.now());
    const { data, error } = await db()
      .upsert(
        {
          player_id: person.id,
          room_code: code,
          person: json(person),
          position,
          seen_at: now,
          gone_at: null,
          ...(had?.room === code ? {} : { joined_at: now }),
        },
        { onConflict: "player_id" },
      )
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return toWatcher(data as unknown as Row);
  };
  return {
    get,
    add,
    async remove(playerId, code) {
      const { data, error } = await db()
        .delete()
        .eq("player_id", playerId)
        .eq("room_code", code)
        .select("player_id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    async touch(playerId, code, gone) {
      const now = iso(Date.now());
      const { error } = await db()
        .update({ seen_at: now, gone_at: gone ? now : null })
        .eq("player_id", playerId)
        .eq("room_code", code);
      if (error) throw error;
    },
    async list(code, limit, now) {
      const { data, error, count } = await db()
        .select(COLUMNS, { count: "exact" })
        .eq("room_code", code)
        .gte("seen_at", iso(now - WATCH_STALE_MS))
        .or(`gone_at.is.null,gone_at.gt.${iso(now - GONE_GRACE_MS)}`)
        .order("position", { ascending: true })
        .order("joined_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return {
        total: count ?? data?.length ?? 0,
        watchers: ((data ?? []) as unknown as Row[]).map(toWatcher),
      };
    },
    async move(playerId, code, position) {
      const { error } = await db()
        .update({ position })
        .eq("player_id", playerId)
        .eq("room_code", code);
      if (error) throw error;
    },
    async rename(person) {
      const { error } = await db()
        .update({ person: json(person) })
        .eq("player_id", person.id);
      if (error) throw error;
    },
    async reassign(from, to) {
      const had = await get(from);
      if (!had) return;
      // the account may already watch somewhere: the guest's row gives way
      const { error } = await db().delete().eq("player_id", from);
      if (error) throw error;
      if (!(await get(to.id))) await add(had.room, to);
    },
    async prune(before) {
      const { error } = await db().delete().lt("seen_at", iso(before));
      if (error) throw error;
    },
    async counts(codes, now) {
      if (!codes.length) return {};
      const { data, error } = await db()
        .select("room_code")
        .in("room_code", codes)
        .gte("seen_at", iso(now - WATCH_STALE_MS))
        .or(`gone_at.is.null,gone_at.gt.${iso(now - GONE_GRACE_MS)}`)
        .limit(2000);
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of (data ?? []) as { room_code: string }[])
        out[r.room_code] = (out[r.room_code] ?? 0) + 1;
      return out;
    },
  };
}
