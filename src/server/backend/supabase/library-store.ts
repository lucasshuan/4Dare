import "server-only";
import { normalizeName } from "@/game/match";
import { isTaste } from "@/game/tastes";
import { LANGS, type Lang } from "@/game/types";
import type {
  AliasEvent,
  CatalogRow,
  LibraryStore,
  StoredAlias,
} from "../community-types";
import { serviceClient } from "./clients";

const ms = (iso: string) => new Date(iso).getTime();

const toAlias = (r: {
  id: number;
  character_id: string;
  lang: string;
  name: string;
  created_by: string | null;
  edited_by: string | null;
  hidden: boolean;
  removed: boolean;
  created_at: string;
}): StoredAlias => ({
  id: r.id,
  characterId: r.character_id,
  lang: r.lang as Lang,
  name: r.name,
  createdBy: r.created_by,
  editedBy: r.edited_by,
  hidden: r.hidden,
  removed: r.removed,
  createdAt: ms(r.created_at),
});

const ALIAS_COLUMNS =
  "id, character_id, lang, name, created_by, edited_by, hidden, removed, created_at";

export function supabaseLibraryStore(): LibraryStore {
  const db = () => serviceClient();
  return {
    async catalogPage(lang, after, limit) {
      const { data, error } = await db().rpc("character_catalog", {
        p_lang: lang,
        p_after: after ?? "",
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []).map(
        (r): CatalogRow => ({
          id: r.id,
          name: r.name,
          origin: r.origin,
          imageUrl: r.image_url,
          popularity: r.popularity,
          createdAt: ms(r.created_at),
          createdBy: r.created_by,
          taste: isTaste(r.taste) ? r.taste : null,
          pictures: r.pictures,
          aliases: r.aliases ?? [],
          otherNames: r.other_names ?? [],
          langs: (r.langs ?? []).filter((l): l is Lang =>
            (LANGS as readonly string[]).includes(l),
          ),
        }),
      );
    },
    async names(id) {
      const { data, error } = await db()
        .from("character_names")
        .select("lang, name, aliases")
        .eq("character_id", id);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        lang: r.lang as Lang,
        name: r.name,
        aliases: r.aliases ?? [],
      }));
    },
    async aliases(id) {
      const { data, error } = await db()
        .from("character_aliases")
        .select(ALIAS_COLUMNS)
        .eq("character_id", id)
        .eq("removed", false)
        .order("id");
      if (error) throw error;
      return (data ?? []).map(toAlias);
    },
    async alias(id) {
      const { data, error } = await db()
        .from("character_aliases")
        .select(ALIAS_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toAlias(data) : null;
    },
    async history(id, limit) {
      const { data, error } = await db()
        .from("character_alias_events")
        .select("id, alias_id, action, before, after, actor, created_at")
        .eq("character_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map(
        (r): AliasEvent => ({
          id: r.id,
          aliasId: r.alias_id,
          action: r.action as AliasEvent["action"],
          before: r.before,
          after: r.after,
          actor: r.actor,
          createdAt: ms(r.created_at),
        }),
      );
    },
    async picks(id) {
      const keys = [id, ...LANGS.map((l) => `${l}-${id}`)];
      const { count, error } = await db()
        .from("match_players")
        .select("match_id", { count: "exact", head: true })
        .in("character_id", keys);
      if (error) throw error;
      return count ?? 0;
    },
    async themesOf(id) {
      const { data, error } = await db()
        .from("whoami_theme_starters")
        .select("theme_id, whoami_themes!inner(active)")
        .eq("character_id", id)
        .eq("whoami_themes.active", true);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => r.theme_id))];
    },
    async addAlias(characterId, lang, name, norm, actor) {
      const { data, error } = await db().rpc("add_character_alias", {
        p_character: characterId,
        p_lang: lang,
        p_name: name,
        p_norm: norm,
        p_actor: actor,
      });
      if (error) throw error;
      return data ?? null;
    },
    async changeAlias(id, action, name, norm, actor) {
      const { data, error } = await db().rpc("change_character_alias", {
        p_id: id,
        p_action: action,
        p_name: name,
        p_norm: norm,
        p_actor: actor,
      });
      if (error) throw error;
      return data as "ok" | "limit" | "taken" | "missing";
    },
    async reportAlias(id, reporter) {
      const { data, error } = await db().rpc("report_character_alias", {
        p_id: id,
        p_reporter: reporter,
      });
      if (error) throw error;
      return !!data;
    },
    async create(input) {
      const made = await db()
        .from("characters")
        .insert({
          id: input.id,
          custom_origin: input.origin,
          tastes: [input.taste],
          created_by: input.createdBy,
        });
      if (made.error) throw made.error;
      // every language searches it by the name it was given until someone names it there
      const named = await db()
        .from("character_names")
        .upsert(
          LANGS.map((lang) => ({
            character_id: input.id,
            lang,
            name: input.name,
            norm: normalizeName(input.name),
            popularity: lang === input.lang ? 0 : null,
          })),
          { onConflict: "character_id,lang", ignoreDuplicates: true },
        );
      if (named.error) throw named.error;
    },
    async addName(id, lang, name) {
      const { error } = await db()
        .from("character_names")
        .upsert(
          { character_id: id, lang, name, norm: normalizeName(name) },
          { onConflict: "character_id,lang", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async exists(id) {
      const { count, error } = await db()
        .from("characters")
        .select("id", { count: "exact", head: true })
        .eq("id", id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    async total() {
      const { count, error } = await db()
        .from("characters")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  };
}
