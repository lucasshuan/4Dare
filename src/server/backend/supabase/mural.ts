import "server-only";
import { GameError } from "@/game/types";
import type { MuralStore, StoredComment } from "../types";
import { serviceClient } from "./clients";
import type { Database } from "./database.types";

type Row = Database["public"]["Tables"]["profile_comments"]["Row"];

const COLUMNS =
  "id, profile_id, author_id, parent_id, body, hidden, created_at";

const toComment = (r: Row): StoredComment => ({
  id: r.id,
  profileId: r.profile_id,
  authorId: r.author_id,
  parentId: r.parent_id,
  body: r.body,
  hidden: r.hidden,
  createdAt: Date.parse(r.created_at),
});

/** Table profile_comments (0030): the per-author limit and the reports live in SQL. */
export function supabaseMural(): MuralStore {
  const comments = () => serviceClient().from("profile_comments");
  return {
    async page(profileId, before, limit) {
      let query = comments()
        .select(COLUMNS)
        .eq("profile_id", profileId)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);
      if (before !== null)
        query = query.lt("created_at", new Date(before).toISOString());
      const { data, error } = await query;
      if (error) throw error;
      const lines = (data ?? []).map(toComment);
      const more = lines.length > limit;
      const shown = lines.slice(0, limit);
      if (shown.length === 0) return { lines: [], replies: [], more };
      const answered = await comments()
        .select(COLUMNS)
        .in(
          "parent_id",
          shown.map((l) => l.id),
        )
        .order("created_at", { ascending: true });
      if (answered.error) throw answered.error;
      return {
        lines: shown,
        replies: (answered.data ?? []).map(toComment),
        more,
      };
    },
    async get(id) {
      const { data, error } = await comments()
        .select(COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? toComment(data) : null;
    },
    async post({ profileId, authorId, parentId, body }) {
      const { data, error } = await serviceClient().rpc(
        "post_profile_comment",
        {
          p_profile: profileId,
          p_author: authorId,
          // a top line: the function takes null for "no parent"
          p_parent: parentId as number,
          p_body: body,
        },
      );
      if (error?.message.includes("bad parent"))
        throw new GameError("invalid_input");
      if (error) throw error;
      return data ?? null;
    },
    async remove(id) {
      const { error } = await comments().delete().eq("id", id);
      if (error) throw error;
    },
    async report(id, reporterId) {
      const { data, error } = await serviceClient().rpc(
        "report_profile_comment",
        { p_comment: id, p_reporter: reporterId },
      );
      if (error) throw error;
      return data === true;
    },
  };
}
