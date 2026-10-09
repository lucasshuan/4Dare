import "server-only";
import type { Lang } from "@/game/types";
import type { StoredSuggestion, WorkshopStore } from "../community-types";
import { json, serviceClient } from "./clients";

const ms = (iso: string | null) => (iso ? new Date(iso).getTime() : null);

const COLUMNS =
  "id, kind, status, lang, payload, translations, created_by, yes, no, reason, bank_id, decided_by, decided_at, created_at";

type Row = {
  id: string;
  kind: string;
  status: string;
  lang: string;
  payload: unknown;
  translations: unknown;
  created_by: string | null;
  yes: number;
  no: number;
  reason: string | null;
  bank_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

const toSuggestion = (r: Row): StoredSuggestion => ({
  id: r.id,
  kind: r.kind as StoredSuggestion["kind"],
  status: r.status as StoredSuggestion["status"],
  lang: r.lang as Lang,
  payload: r.payload,
  translations: (r.translations ?? {}) as StoredSuggestion["translations"],
  createdBy: r.created_by,
  yes: r.yes,
  no: r.no,
  reason: r.reason,
  bankId: r.bank_id,
  decidedBy: r.decided_by,
  decidedAt: ms(r.decided_at),
  createdAt: ms(r.created_at) ?? 0,
});

const TABLE = {
  theme: "whoami_themes",
  question: "impostor_questions",
  mission: "lineup_missions",
} as const;

export function supabaseWorkshopStore(): WorkshopStore {
  const db = () => serviceClient();
  return {
    async suggestions() {
      const { data, error } = await db()
        .from("workshop_suggestions")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data as Row[]).map(toSuggestion);
    },
    async suggestion(id) {
      const { data, error } = await db()
        .from("workshop_suggestions")
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toSuggestion(data as Row) : null;
    },
    async create(kind, lang, payload, translations, author) {
      const { data, error } = await db().rpc("create_workshop_suggestion", {
        p_kind: kind,
        p_lang: lang,
        p_payload: json(payload),
        p_translations: json(translations),
        p_author: author,
      });
      if (error) throw error;
      return (data as string | null) ?? null;
    },
    async vote(id, user, vote) {
      const { data, error } = await db().rpc("vote_workshop_suggestion", {
        p_suggestion: id,
        p_user: user,
        // null takes the vote back
        p_vote: vote as boolean,
      });
      if (error) throw error;
      const row = (data ?? [])[0];
      return { yes: row?.yes ?? 0, no: row?.no ?? 0 };
    },
    async votesOf(user) {
      const { data, error } = await db()
        .from("workshop_votes")
        .select("suggestion_id, vote")
        .eq("user_id", user);
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.suggestion_id, r.vote]));
    },
    async sentThisWeek(author) {
      const now = new Date();
      // Monday 00:00 UTC, like the database's date_trunc('week', now())
      const monday = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - ((now.getUTCDay() + 6) % 7),
        ),
      );
      const { count, error } = await db()
        .from("workshop_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("created_by", author)
        .gte("created_at", monday.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    async decide(id, patch) {
      const { error } = await db()
        .from("workshop_suggestions")
        .update({
          status: patch.status,
          reason: patch.reason,
          bank_id: patch.bankId,
          translations: json(patch.translations),
          decided_by: patch.by,
          decided_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    async insertBank(row) {
      if (row.kind === "theme") {
        const made = await db().from("whoami_themes").insert({
          id: row.id,
          active: true,
          en: row.names.en,
          es: row.names.es,
          ja: row.names.ja,
          pt: row.names.pt,
          theme_set: row.set,
          games: row.games,
          source: "bank",
        });
        if (made.error) throw made.error;
        const starters = await db()
          .from("whoami_theme_starters")
          .insert(
            row.starters.map((s) => ({
              theme_id: row.id,
              character_id: s.characterId,
              lang: s.lang,
              position: s.position,
            })),
          );
        if (starters.error) throw starters.error;
        return;
      }
      if (row.kind === "question") {
        const { error } = await db()
          .from("impostor_questions")
          .insert({
            id: row.id,
            kind: row.questionKind,
            scope: row.scope,
            theme_set: row.set,
            theme_id: row.themeId,
            audience: row.audience,
            spice: row.spice,
            en: row.texts.en,
            es: row.texts.es,
            ja: row.texts.ja,
            pt: row.texts.pt,
            options: json(row.options),
            created_by: row.createdBy,
            status: "live",
          });
        if (error) throw error;
        return;
      }
      const { error } = await db().from("lineup_missions").insert({
        id: row.id,
        tone: row.tone,
        heavy: row.heavy,
        en: row.texts.en,
        es: row.texts.es,
        ja: row.texts.ja,
        pt: row.texts.pt,
        created_by: row.createdBy,
        status: "live",
      });
      if (error) throw error;
    },
    async bankIdTaken(kind, id) {
      const { count, error } = await db()
        .from(TABLE[kind])
        .select("id", { count: "exact", head: true })
        .eq("id", id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    async isCurator(user) {
      const { data, error } = await db()
        .from("profiles")
        .select("curator")
        .eq("id", user)
        .maybeSingle();
      if (error) return false;
      return !!data?.curator;
    },
  };
}
