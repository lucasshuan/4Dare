import "server-only";
import { isGameKey } from "@/game/games";
import type { QuestionKind } from "@/game/impostor/types";
import type { Tone } from "@/game/lineup/bank";
import type { ThemeSet } from "@/game/theme-sets";
import {
  type AdminStats,
  type AdminStore,
  type ConfigVersion,
  readValues,
} from "../admin-types";
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

const toVersion = (r: {
  id: number;
  values: unknown;
  note: string | null;
  author_id: string | null;
  created_at: string;
}): ConfigVersion => ({
  v: r.id,
  values: readValues(r.values),
  note: r.note,
  author: r.author_id,
  at: Date.parse(r.created_at),
});

/** Supabase: admin_stats (0054), admin_audit (0053) and game_config (0055), server only. */
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
    async config() {
      const [v] = await this.versions(1);
      return (
        v ?? { v: 0, values: readValues({}), note: null, author: null, at: 0 }
      );
    },
    async versions(limit) {
      const { data, error } = await serviceClient()
        .from("game_config")
        .select("id, values, note, author_id, created_at")
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(toVersion);
    },
    async banks() {
      const db = serviceClient();
      const [t, q, m, x] = await Promise.all([
        db
          .from("whoami_themes")
          .select("id, pt, theme_set, games, active")
          .order("pt"),
        db
          .from("impostor_questions")
          .select("id, pt, kind, spice, scope, status")
          .order("id"),
        db
          .from("lineup_missions")
          .select("id, pt, tone, heavy, status")
          .order("id"),
        db
          .from("lineup_extras")
          .select("id, pt, emoji, tint, status")
          .order("id"),
      ]);
      for (const r of [t, q, m, x]) if (r.error) throw r.error;
      return {
        themes: (t.data ?? []).map((r) => ({
          id: r.id,
          pt: r.pt,
          set: r.theme_set as ThemeSet | null,
          games: (r.games ?? []).filter(isGameKey),
          live: r.active,
        })),
        questions: (q.data ?? []).map((r) => ({
          id: r.id,
          pt: r.pt,
          kind: r.kind as QuestionKind,
          spice: r.spice as 1 | 2 | 3,
          scope: r.scope as "general" | "set" | "theme",
          live: r.status === "live",
        })),
        missions: (m.data ?? []).map((r) => ({
          id: r.id,
          pt: r.pt,
          tone: r.tone as Tone,
          heavy: r.heavy,
          live: r.status === "live",
        })),
        extras: (x.data ?? []).map((r) => ({
          id: r.id,
          pt: r.pt,
          emoji: r.emoji,
          tint: r.tint,
          live: r.status === "live",
        })),
      };
    },
    async setLive(kind, id, live) {
      const db = serviceClient();
      if (kind === "theme") {
        const { data: before } = await db
          .from("whoami_themes")
          .select("active")
          .eq("id", id)
          .maybeSingle();
        if (!before) return null;
        const { error } = await db
          .from("whoami_themes")
          .update({ active: live })
          .eq("id", id);
        if (error) throw error;
        return before.active;
      }
      const table = (
        {
          question: "impostor_questions",
          mission: "lineup_missions",
          extra: "lineup_extras",
        } as const
      )[kind];
      const { data: before } = await db
        .from(table)
        .select("status")
        .eq("id", id)
        .maybeSingle();
      if (!before) return null;
      const { error } = await db
        .from(table)
        .update({ status: live ? "live" : "hidden" })
        .eq("id", id);
      if (error) throw error;
      return before.status === "live";
    },
    async saveConfig(values, note, author) {
      const { data, error } = await serviceClient()
        .from("game_config")
        .insert({ values: json(values), note, author_id: author })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
  };
}
