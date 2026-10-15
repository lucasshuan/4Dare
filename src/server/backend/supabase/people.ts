import "server-only";
import { isGameKey } from "@/game/games";
import type { Avatar, Lang } from "@/game/types";
import { LANGS } from "@/game/types";
import type { Role } from "../../contract";
import type {
  AdminReport,
  AdminUser,
  AdminUserDetail,
  PeopleStore,
  PersonRef,
  Sanction,
  SanctionKind,
} from "../people-types";
import { serviceClient } from "./clients";

const ms = (v: unknown) => (typeof v === "string" ? Date.parse(v) : null);
// biome-ignore lint/suspicious/noExplicitAny: jsonb, read field by field
type Raw = Record<string, any>;

const PROFILE =
  "id, name, handle, avatar, role, created_at, about, quote, accent, privacy, settings";

const langsOf = (about: unknown): Lang[] => {
  const l = (about as Raw | null)?.langs;
  return Array.isArray(l)
    ? l.filter((x): x is Lang => (LANGS as readonly string[]).includes(x))
    : [];
};

/** Every auth user's sign-ins and providers, by id (a page of 1000 is plenty for now). */
async function authUsers() {
  const out = new Map<
    string,
    { seenAt: number | null; providers: AdminUser["providers"] }
  >();
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await serviceClient().auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users)
      out.set(u.id, {
        seenAt: ms(u.last_sign_in_at),
        providers: (u.identities ?? []).map((i) => {
          const d = (i.identity_data ?? {}) as Raw;
          return {
            provider: i.provider,
            name:
              d.full_name ??
              d.global_name ??
              d.name ??
              d.user_name ??
              d.preferred_username ??
              d.email ??
              null,
            at: ms(i.created_at),
          };
        }),
      });
    if (data.users.length < 1000) break;
  }
  return out;
}

function toSanction(r: Raw): Sanction {
  return {
    id: Number(r.id),
    person: r.person,
    kind: r.kind as SanctionKind,
    until: ms(r.until),
    reason: r.reason ?? null,
    wipe: !!r.wipe,
    upTo: ms(r.up_to) ?? 0,
    author: r.author_id ?? null,
    at: ms(r.created_at) ?? 0,
    liftedAt: ms(r.lifted_at),
    seenAt: ms(r.seen_at),
  };
}

const lineText = (l: Raw) =>
  typeof l?.text === "string"
    ? l.text
    : typeof l?.body === "string"
      ? l.body
      : "";

/** Supabase: the panel's people (profiles, auth users, the four report tables, sanctions). */
export function supabasePeople(): PeopleStore {
  const db = () => serviceClient();
  const base = (
    p: Raw,
    stats: Raw | undefined,
    auth: Raw | undefined,
  ): AdminUser => {
    const perGame: AdminUser["perGame"] = {};
    for (const [g, n] of Object.entries((stats?.per_game ?? {}) as Raw))
      if (isGameKey(g)) perGame[g] = Number(n);
    return {
      id: p.id,
      name: p.name ?? null,
      handle: p.handle ?? null,
      avatar: (p.avatar as Avatar | null) ?? null,
      role: (p.role ?? "player") as Role,
      langs: langsOf(p.about),
      providers: auth?.providers ?? [],
      plays: stats?.plays ?? 0,
      xp: stats?.xp ?? 0,
      wins: stats?.wins ?? 0,
      perGame,
      firstAt: ms(stats?.first_at),
      lastAt: ms(stats?.last_at),
      seenAt: auth?.seenAt ?? null,
      createdAt: ms(p.created_at) ?? 0,
    };
  };
  return {
    async users() {
      const [profiles, stats, auth] = await Promise.all([
        db().from("profiles").select(PROFILE).limit(5000),
        db().rpc("admin_people"),
        authUsers(),
      ]);
      if (profiles.error) throw profiles.error;
      if (stats.error) throw stats.error;
      const byId = new Map((stats.data ?? []).map((s) => [s.user_id, s]));
      return (profiles.data ?? []).map((p) =>
        base(p, byId.get(p.id), auth.get(p.id)),
      );
    },
    async user(id) {
      const { data: p, error } = await db()
        .from("profiles")
        .select(PROFILE)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;
      const count = async (
        q: PromiseLike<{ count: number | null; error: unknown }>,
      ) => {
        const r = await q;
        if (r.error) throw r.error;
        return r.count ?? 0;
      };
      const head = { count: "exact" as const, head: true };
      const [
        stats,
        auth,
        badges,
        pics,
        chars,
        muralIn,
        muralOut,
        sugg,
        live,
        votes,
      ] = await Promise.all([
        db().rpc("admin_people"),
        db().auth.admin.getUserById(id),
        db()
          .from("user_badges")
          .select("badge, game, earned_at")
          .eq("user_id", id),
        count(
          db().from("character_images").select("id", head).eq("created_by", id),
        ),
        count(db().from("characters").select("id", head).eq("created_by", id)),
        count(
          db().from("profile_comments").select("id", head).eq("profile_id", id),
        ),
        count(
          db().from("profile_comments").select("id", head).eq("author_id", id),
        ),
        count(
          db()
            .from("workshop_suggestions")
            .select("id", head)
            .eq("created_by", id),
        ),
        count(
          db()
            .from("workshop_suggestions")
            .select("id", head)
            .eq("created_by", id)
            .eq("status", "live"),
        ),
        count(
          db().from("workshop_votes").select("user_id", head).eq("user_id", id),
        ),
      ]);
      if (stats.error) throw stats.error;
      if (badges.error) throw badges.error;
      const u = auth.data?.user;
      const a = u
        ? {
            seenAt: ms(u.last_sign_in_at),
            providers: (u.identities ?? []).map((i) => {
              const d = (i.identity_data ?? {}) as Raw;
              return {
                provider: i.provider,
                name:
                  d.full_name ?? d.global_name ?? d.name ?? d.user_name ?? null,
                at: ms(i.created_at),
              };
            }),
          }
        : undefined;
      const row = (stats.data ?? []).find((s) => s.user_id === id);
      const settings = (p.settings ?? {}) as Raw;
      return {
        ...base(p, row, a),
        quote: p.quote ?? null,
        accent: p.accent ?? null,
        about: p.about ?? null,
        privacy: p.privacy ?? null,
        theme: typeof settings.theme === "string" ? settings.theme : null,
        badges: (badges.data ?? []).map((b) => ({
          badge: b.badge,
          game: b.game,
          at: ms(b.earned_at) ?? 0,
        })),
        contrib: {
          pics,
          chars,
          muralIn,
          muralOut,
          suggestions: sugg,
          live,
          votes,
        },
      } satisfies AdminUserDetail;
    },
    async people(ids) {
      const want = [...new Set(ids)];
      if (!want.length) return [];
      const uuid = want.filter((x) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          x,
        ),
      );
      const out = new Map<string, PersonRef>();
      if (uuid.length) {
        const { data, error } = await db()
          .from("profiles")
          .select("id, name, handle, avatar, guest_number")
          .in("id", uuid);
        if (error) throw error;
        for (const p of data ?? [])
          out.set(p.id, {
            id: p.id,
            account: true,
            name: p.name,
            handle: p.handle,
            guestNumber: p.guest_number,
            avatar: p.avatar as unknown as Avatar,
          });
      }
      const rest = want.filter((x) => !out.has(x));
      if (rest.length) {
        // a guest: as a report showed them, else the number a match kept
        const [reps, plays] = await Promise.all([
          db()
            .from("player_reports")
            .select("target_id, target")
            .in("target_id", rest),
          db()
            .from("match_players")
            .select("user_id, guest_number")
            .in("user_id", rest)
            .not("guest_number", "is", null)
            .limit(1000),
        ]);
        if (reps.error) throw reps.error;
        if (plays.error) throw plays.error;
        for (const r of reps.data ?? []) {
          const t = r.target as Raw;
          out.set(r.target_id, {
            id: r.target_id,
            account: false,
            name: t?.name ?? null,
            handle: null,
            guestNumber:
              typeof t?.guestNumber === "number" ? t.guestNumber : null,
            avatar: (t?.avatar as Avatar) ?? null,
          });
        }
        for (const r of plays.data ?? [])
          if (!out.has(r.user_id))
            out.set(r.user_id, {
              id: r.user_id,
              account: false,
              name: null,
              handle: null,
              guestNumber: r.guest_number,
              avatar: null,
            });
        for (const id of rest)
          if (!out.has(id))
            out.set(id, {
              id,
              account: false,
              name: null,
              handle: null,
              guestNumber: null,
              avatar: null,
            });
      }
      return [...out.values()];
    },
    async reports() {
      const [room, mural, pic, alias] = await Promise.all([
        db()
          .from("player_reports")
          .select(
            "id, reporter_id, target_id, room_code, reason, note, lines, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(2000),
        db()
          .from("profile_comment_reports")
          .select(
            "comment_id, reporter_id, created_at, profile_comments(profile_id, author_id, body, hidden)",
          )
          .limit(2000),
        db()
          .from("character_image_reports")
          .select(
            "image_id, reporter_id, created_at, character_images(character_id, url, created_by, status, reports)",
          )
          .limit(2000),
        db()
          .from("character_alias_reports")
          .select(
            "alias_id, reporter_id, created_at, character_aliases(character_id, name, created_by, hidden)",
          )
          .limit(2000),
      ]);
      for (const r of [room, mural, pic, alias]) if (r.error) throw r.error;
      const out: AdminReport[] = [];
      for (const r of room.data ?? [])
        out.push({
          id: `room:${r.id}`,
          kind: "room",
          targetId: r.target_id,
          reporterId: r.reporter_id,
          at: ms(r.created_at) ?? 0,
          reason: r.reason as AdminReport["reason"],
          note: r.note,
          room: r.room_code,
          lines: ((r.lines as Raw[] | null) ?? []).map((l) => ({
            at: typeof l.at === "number" ? l.at : (ms(l.at) ?? 0),
            text: lineText(l),
          })),
        });
      const per = (rows: Raw[], key: string) => {
        const n = new Map<string, number>();
        for (const r of rows)
          n.set(String(r[key]), (n.get(String(r[key])) ?? 0) + 1);
        return n;
      };
      const muralN = per(mural.data ?? [], "comment_id");
      for (const r of (mural.data ?? []) as Raw[]) {
        const c = r.profile_comments as Raw | null;
        if (!c?.author_id) continue;
        out.push({
          id: `mural:${r.comment_id}:${r.reporter_id}`,
          kind: "mural",
          targetId: c.author_id,
          reporterId: r.reporter_id,
          at: ms(r.created_at) ?? 0,
          text: c.body,
          where: c.profile_id,
          count: muralN.get(String(r.comment_id)) ?? 1,
          hidden: !!c.hidden,
        });
      }
      for (const r of (pic.data ?? []) as Raw[]) {
        const i = r.character_images as Raw | null;
        if (!i?.created_by) continue;
        out.push({
          id: `pic:${r.image_id}:${r.reporter_id}`,
          kind: "pic",
          targetId: i.created_by,
          reporterId: r.reporter_id,
          at: ms(r.created_at) ?? 0,
          text: i.character_id,
          img: i.url,
          count: Number(i.reports ?? 1),
          hidden: i.status === "hidden",
        });
      }
      const aliasN = per(alias.data ?? [], "alias_id");
      for (const r of (alias.data ?? []) as Raw[]) {
        const a = r.character_aliases as Raw | null;
        if (!a?.created_by) continue;
        out.push({
          id: `alias:${r.alias_id}:${r.reporter_id}`,
          kind: "alias",
          targetId: a.created_by,
          reporterId: r.reporter_id,
          at: ms(r.created_at) ?? 0,
          text: a.name,
          where: a.character_id,
          count: aliasN.get(String(r.alias_id)) ?? 1,
          hidden: !!a.hidden,
        });
      }
      return out.sort((a, b) => b.at - a.at);
    },
    async sanctions(person) {
      let q = db()
        .from("sanctions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (person) q = q.eq("person", person);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(toSanction);
    },
    async addSanction(s) {
      const { data, error } = await db()
        .from("sanctions")
        .insert({
          person: s.person,
          kind: s.kind,
          until: s.until === null ? null : new Date(s.until).toISOString(),
          reason: s.reason,
          wipe: s.wipe,
          author_id: s.author,
        })
        .select("id")
        .single();
      if (error) throw error;
      return Number(data.id);
    },
    async liftSanction(id) {
      const { error } = await db()
        .from("sanctions")
        .update({ lifted_at: new Date().toISOString() })
        .eq("id", id)
        .is("lifted_at", null);
      if (error) throw error;
    },
    async seeSanction(id) {
      const { error } = await db()
        .from("sanctions")
        .update({ seen_at: new Date().toISOString() })
        .eq("id", id)
        .is("seen_at", null);
      if (error) throw error;
    },
    async wipe(person) {
      const isUuid = /^[0-9a-f-]{36}$/i.test(person);
      const [lines, pics, aliases] = await Promise.all([
        isUuid
          ? db()
              .from("profile_comments")
              .update({ hidden: true })
              .eq("author_id", person)
              .eq("hidden", false)
              .select("id")
          : Promise.resolve({ data: [], error: null }),
        // a player's picture (never the library's own, created_by null)
        db()
          .from("character_images")
          .update({ status: "hidden" })
          .eq("created_by", person)
          .neq("status", "hidden")
          .select("id"),
        isUuid
          ? db()
              .from("character_aliases")
              .update({ hidden: true })
              .eq("created_by", person)
              .eq("hidden", false)
              .select("id")
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const r of [lines, pics, aliases]) if (r.error) throw r.error;
      return (
        (lines.data?.length ?? 0) +
        (pics.data?.length ?? 0) +
        (aliases.data?.length ?? 0)
      );
    },
    async setRole(id, role) {
      const { error } = await db()
        .from("profiles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    async voters(ids) {
      if (!ids.length) return [];
      const [profiles, stats] = await Promise.all([
        db().from("profiles").select("id, role").in("id", ids),
        db().rpc("admin_people"),
      ]);
      if (profiles.error) throw profiles.error;
      if (stats.error) throw stats.error;
      const xp = new Map((stats.data ?? []).map((r) => [r.user_id, r.xp]));
      return (profiles.data ?? []).map((p) => ({
        id: p.id,
        xp: xp.get(p.id) ?? 0,
        role: (p.role ?? "player") as Role,
      }));
    },
    async reassign(from, to) {
      const { error } = await db().rpc("reassign_sanctions", {
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
    },
  };
}
