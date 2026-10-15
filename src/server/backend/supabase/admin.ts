import "server-only";
import type { AdminStats, AdminStore } from "../admin-types";
import { json, serviceClient } from "./clients";

const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) : null);
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

// biome-ignore lint/suspicious/noExplicitAny: the rpc's jsonb, read field by field
type Raw = Record<string, any>;

/** admin_stats' snake_case jsonb, as the panel reads it. */
export function parseStats(r: Raw): AdminStats {
  const spice: Raw = r.banks?.spice ?? {};
  return {
    since: ms(r.since),
    matches: num(r.matches),
    plays: num(r.plays),
    players: num(r.players),
    games: (r.games ?? []).map((g: Raw) => ({
      game: g.game,
      matches: num(g.matches),
      avgSec: g.avg_sec == null ? null : num(g.avg_sec),
      last: ms(g.last) ?? 0,
    })),
    days: (r.days ?? []).map((d: Raw) => ({ day: d.day, by: d.by ?? {} })),
    langs: r.langs ?? {},
    topThemes: (r.top_themes ?? []).map((t: Raw) => ({
      id: t.id,
      name: t.name,
      n: num(t.n),
    })),
    topPicks: (r.top_picks ?? []).map((t: Raw) => ({
      id: t.id,
      name: t.name,
      n: num(t.n),
    })),
    rooms: {
      open: num(r.rooms?.open),
      lobby: num(r.rooms?.lobby),
      playing: num(r.rooms?.playing),
      activeHour: num(r.rooms?.active_hour),
      stale: num(r.rooms?.stale),
    },
    library: {
      characters: num(r.library?.characters),
      byPlayers: num(r.library?.by_players),
      images: num(r.library?.images),
      pending: num(r.library?.pending),
      pendingSince: ms(r.library?.pending_since),
      aliases: num(r.library?.aliases),
    },
    banks: {
      themesOn: num(r.banks?.themes_on),
      themesOff: num(r.banks?.themes_off),
      questions: num(r.banks?.questions),
      spice: { 1: num(spice["1"]), 2: num(spice["2"]), 3: num(spice["3"]) },
      missions: num(r.banks?.missions),
      heavy: num(r.banks?.heavy),
      extras: num(r.banks?.extras),
      blocked: num(r.banks?.blocked),
    },
    workshop: {
      voting: num(r.workshop?.voting),
      review: num(r.workshop?.review),
    },
    reportsWeek: num(r.reports_week),
  };
}

/** Supabase: admin_stats (0054) and admin_audit (0053), server only. */
export function supabaseAdmin(): AdminStore {
  return {
    async stats(days) {
      const { data, error } = await serviceClient().rpc("admin_stats", {
        p_days: days,
      });
      if (error) throw error;
      return parseStats((data ?? {}) as Raw);
    },
    async audit(e) {
      const { error } = await serviceClient()
        .from("admin_audit")
        .insert({
          actor_id: e.actor,
          action: e.action,
          target: e.target,
          before: e.before === undefined ? null : json(e.before),
          after: e.after === undefined ? null : json(e.after),
          note: e.note ?? null,
        });
      if (error) throw error;
    },
  };
}
