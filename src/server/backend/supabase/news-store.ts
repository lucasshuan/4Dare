import "server-only";
import type { Lang } from "@/game/types";
import type { NewsReaction, NewsStore, StoredNews } from "../community-types";
import { json, serviceClient } from "./clients";

type Texts = Partial<Record<Lang, string>>;

export function supabaseNewsStore(): NewsStore {
  const db = () => serviceClient();
  return {
    async list() {
      const { data, error } = await db()
        .from("news_posts")
        .select(
          "id, published_at, kind, game, title, body, action, suggestion_id",
        )
        .eq("hidden", false)
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map(
        (r): StoredNews => ({
          id: r.id,
          publishedAt: new Date(r.published_at).getTime(),
          kind: r.kind as StoredNews["kind"],
          game: r.game as StoredNews["game"],
          title: (r.title ?? {}) as Texts,
          body: (r.body ?? {}) as Texts,
          action: (r.action ?? null) as StoredNews["action"],
          suggestionId: r.suggestion_id,
        }),
      );
    },
    async insert(post) {
      const { error } = await db()
        .from("news_posts")
        .upsert(
          {
            id: post.id,
            published_at: new Date(post.publishedAt).toISOString(),
            kind: post.kind,
            game: post.game,
            featured: false,
            title: json(post.title),
            body: json(post.body),
            action: json(post.action),
            suggestion_id: post.suggestionId,
          },
          { onConflict: "id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async toggle(postId, user, reaction) {
      const { data, error } = await db().rpc("toggle_news_reaction", {
        p_post: postId,
        p_user: user,
        p_reaction: reaction,
      });
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((r) => [r.reaction, r.total]),
      ) as Partial<Record<NewsReaction, number>>;
    },
    async counts() {
      const { data, error } = await db()
        .from("news_reactions")
        .select("post_id, reaction");
      if (error) throw error;
      const out = new Map<string, Partial<Record<NewsReaction, number>>>();
      for (const r of data ?? []) {
        const c = out.get(r.post_id) ?? {};
        const k = r.reaction as NewsReaction;
        c[k] = (c[k] ?? 0) + 1;
        out.set(r.post_id, c);
      }
      return out;
    },
    async mine(user) {
      const { data, error } = await db()
        .from("news_reactions")
        .select("post_id, reaction")
        .eq("user_id", user);
      if (error) throw error;
      const out = new Map<string, NewsReaction[]>();
      for (const r of data ?? [])
        out.set(r.post_id, [
          ...(out.get(r.post_id) ?? []),
          r.reaction as NewsReaction,
        ]);
      return out;
    },
  };
}
