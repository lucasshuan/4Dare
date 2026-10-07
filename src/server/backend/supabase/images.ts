import "server-only";
import type {
  CharacterImage,
  ImageAuthor,
  ImageStatus,
  ImageStore,
} from "../types";
import { json, serviceClient } from "./clients";
import type { Database } from "./database.types";

type Row = Pick<
  Database["public"]["Tables"]["character_images"]["Row"],
  | "id"
  | "character_id"
  | "url"
  | "created_by"
  | "author"
  | "status"
  | "score"
  | "created_at"
  | "moderation"
>;

const COLUMNS =
  "id, character_id, url, created_by, author, status, score, created_at, moderation";

const toImage = (r: Row): CharacterImage => ({
  id: r.id,
  characterId: r.character_id,
  url: r.url,
  createdBy: r.created_by,
  author: (r.author as ImageAuthor | null) ?? null,
  status: r.status as ImageStatus,
  score: r.score ?? 0,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Table character_images (0017); covers move in SQL (refresh_character_cover). */
export function supabaseImages(): ImageStore {
  const db = () => serviceClient();
  const one = async (
    query: PromiseLike<{ data: Row | null; error: unknown }>,
  ) => {
    const { data, error } = await query;
    if (error) throw error;
    return data ? toImage(data) : null;
  };
  const many = async (
    query: PromiseLike<{ data: Row[] | null; error: unknown }>,
  ) => {
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toImage);
  };

  return {
    async add(input) {
      const made = await one(
        db()
          .from("character_images")
          .insert({
            character_id: input.characterId,
            url: input.url,
            created_by: input.createdBy,
            author: json(input.author),
            status: input.status,
            moderation: json(input.moderation ?? null),
          })
          .select(COLUMNS)
          .single(),
      );
      if (!made) throw new Error("character_images: insert returned nothing");
      return made;
    },
    async get(id) {
      if (!UUID.test(id)) return null;
      return one(
        db()
          .from("character_images")
          .select(COLUMNS)
          .eq("id", id)
          .maybeSingle(),
      );
    },
    async find(characterId, url) {
      let query = db().from("character_images").select(COLUMNS).eq("url", url);
      query =
        characterId === null
          ? query.is("character_id", null)
          : query.eq("character_id", characterId);
      return one(query.limit(1).maybeSingle());
    },
    async list(characterId, viewer, limit) {
      const of = () =>
        db()
          .from("character_images")
          .select(COLUMNS)
          .eq("character_id", characterId);
      const [active, mine] = await Promise.all([
        // the best first, straight from the index (character_images_best)
        of()
          .eq("status", "active")
          .order("score", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(limit),
        of().eq("status", "pending").eq("created_by", viewer).limit(20),
      ]);
      if (active.error) throw active.error;
      if (mine.error) throw mine.error;
      return [...(active.data ?? []), ...(mine.data ?? [])]
        .sort(
          (a, b) =>
            (b.score ?? 0) - (a.score ?? 0) ||
            a.created_at.localeCompare(b.created_at),
        )
        .slice(0, limit)
        .map(toImage);
    },
    async attach(image, characterId) {
      if (image.characterId === characterId) return;
      if (image.characterId === null) {
        const { error } = await db()
          .from("character_images")
          .update({ character_id: characterId })
          .eq("id", image.id)
          .is("character_id", null);
        if (error) throw error;
        return;
      }
      const { error } = await db()
        .from("character_images")
        .upsert(
          {
            character_id: characterId,
            url: image.url,
            created_by: image.createdBy,
            author: json(image.author),
            status: image.status,
          },
          { onConflict: "character_id,url", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async recordPick(characterId, url, playerId, chosen) {
      const { error } = await db().rpc("record_image_pick", {
        p_character: characterId,
        p_url: url,
        p_player: playerId,
        p_chosen: chosen,
      });
      if (error) throw error;
    },
    async report(id, reporterId, hideAt) {
      if (!UUID.test(id)) return null;
      const { data, error } = await db().rpc("report_character_image", {
        p_image: id,
        p_reporter: reporterId,
        p_hide_at: hideAt,
      });
      if (error) throw error;
      return (data as ImageStatus | null) ?? null;
    },
    async pending(limit) {
      return many(
        db()
          .from("character_images")
          .select(COLUMNS)
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(limit),
      );
    },
    async approve(id, moderation) {
      const image = await one(
        db()
          .from("character_images")
          .update({ status: "active", moderation: json(moderation ?? null) })
          .eq("id", id)
          .eq("status", "pending")
          .select(COLUMNS)
          .maybeSingle(),
      );
      if (!image?.characterId) return;
      const { error } = await db().rpc("refresh_character_cover", {
        p_character: image.characterId,
      });
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await db()
        .from("character_images")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    async orphans(before, limit) {
      return many(
        db()
          .from("character_images")
          .select(COLUMNS)
          .is("character_id", null)
          .lt("created_at", new Date(before).toISOString())
          .order("created_at", { ascending: true })
          .limit(limit),
      );
    },
    async byAuthor(playerId, withPending, limit) {
      return many(
        db()
          .from("character_images")
          .select(COLUMNS)
          .eq("created_by", playerId)
          .not("character_id", "is", null)
          .in("status", withPending ? ["active", "pending"] : ["active"])
          .order("created_at", { ascending: false })
          .limit(limit),
      );
    },
  };
}
