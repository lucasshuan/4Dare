import "server-only";
import type { CommunityStore, FeedRow, SeatNow } from "../community-types";
import { serviceClient } from "./clients";

// the functions take null for "every game" and "ever"; the generated types say string
const iso = (ms: number | null) =>
  (ms === null ? null : new Date(ms).toISOString()) as string;
const orNull = (v: string | null) => v as string;

export function supabaseCommunityStore(): CommunityStore {
  const db = () => serviceClient();
  return {
    async ranking(game, since, limit) {
      const { data, error } = await db().rpc("xp_ranking", {
        p_game: orNull(game),
        p_since: iso(since),
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        userId: r.user_id,
        xp: r.xp,
        matches: r.matches,
        wins: r.wins,
      }));
    },
    async place(user, game, since) {
      const { data, error } = await db().rpc("xp_ranking_place", {
        p_user: user,
        p_game: orNull(game),
        p_since: iso(since),
      });
      if (error) throw error;
      const r = (data ?? [])[0];
      return r
        ? {
            userId: user,
            place: r.place,
            xp: r.xp,
            matches: r.matches,
            wins: r.wins,
          }
        : null;
    },
    async feed(kind, user, before, limit) {
      const { data, error } = await db().rpc("contribution_feed", {
        p_kind: orNull(kind),
        p_user: orNull(user),
        p_before: iso(before),
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map(
        (r): FeedRow => ({
          kind: r.kind as FeedRow["kind"],
          at: new Date(r.at).getTime(),
          userId: r.user_id,
          characterId: r.character_id,
          ref: r.ref,
          detail: (r.detail ?? {}) as Record<string, unknown>,
        }),
      );
    },
    async contributors(since, limit) {
      const { data, error } = await db().rpc("top_contributors", {
        p_since: iso(since),
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        userId: r.user_id,
        pictures: r.pictures,
        characters: r.characters,
        aliases: r.aliases,
        live: r.live,
        total: r.total,
      }));
    },
    async players(q, offset, limit) {
      let query = db()
        .from("profiles")
        .select("id, handle, name, avatar, privacy")
        .not("handle", "is", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      const term = q.replace(/[%_,()*]/g, " ").trim();
      if (term) query = query.or(`name.ilike.%${term}%,handle.ilike.%${term}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        handle: r.handle ?? "",
        name: r.name,
        avatar: r.avatar,
        privacy: r.privacy,
      }));
    },
    async coPlayers(user) {
      const { data, error } = await db().rpc("co_players", { p_user: user });
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.user_id, r.times]));
    },
    async seated(since) {
      const { data, error } = await db()
        .from("rooms")
        .select("code, state, visibility")
        .neq("phase", "closed")
        .gte("updated_at", new Date(since).toISOString());
      if (error) throw error;
      const out = new Map<string, SeatNow>();
      for (const r of data ?? []) {
        const s = r.state as {
          settings?: { game?: string };
          players?: { id: string; away?: boolean; goneAt?: number | null }[];
        };
        for (const p of s.players ?? [])
          if (!p.away && p.goneAt == null)
            out.set(p.id, {
              game: s.settings?.game ?? "who-am-i",
              code: r.code,
              public: r.visibility === "public",
            });
      }
      return out;
    },
    async mine(user) {
      const head = { count: "exact" as const, head: true };
      const [pictures, aliases, suggestions] = await Promise.all([
        db()
          .from("character_images")
          .select("id", head)
          .eq("created_by", user)
          .eq("status", "active"),
        db()
          .from("character_aliases")
          .select("id", head)
          .eq("created_by", user)
          .eq("removed", false),
        db()
          .from("workshop_suggestions")
          .select("id", head)
          .eq("created_by", user),
      ]);
      return {
        pictures: pictures.count ?? 0,
        aliases: aliases.count ?? 0,
        suggestions: suggestions.count ?? 0,
      };
    },
  };
}
