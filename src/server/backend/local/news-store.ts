import "server-only";
import type { NewsReaction, NewsStore, StoredNews } from "../community-types";
import { processSingleton, readJson, writeJson } from "./disk";

interface Saved {
  posts: StoredNews[];
  reactions: { post: string; user: string; reaction: NewsReaction }[];
}

const FILE = "news.json";

/** The news in local mode, in .data/. */
export function localNewsStore(): NewsStore {
  const data = processSingleton<Saved>("news", () =>
    readJson<Saved>(FILE, { posts: [], reactions: [] }),
  );
  const save = () => writeJson(FILE, data);
  const countOf = (post: string) => {
    const c: Partial<Record<NewsReaction, number>> = {};
    for (const r of data.reactions)
      if (r.post === post) c[r.reaction] = (c[r.reaction] ?? 0) + 1;
    return c;
  };
  return {
    async list() {
      return [...data.posts]
        .filter((p) => p.publishedAt <= Date.now())
        .sort((a, b) => b.publishedAt - a.publishedAt);
    },
    async insert(post) {
      if (!data.posts.some((p) => p.id === post.id)) data.posts.push(post);
      save();
    },
    async toggle(post, user, reaction) {
      const had = data.reactions.findIndex(
        (r) => r.post === post && r.user === user && r.reaction === reaction,
      );
      if (had >= 0) data.reactions.splice(had, 1);
      else data.reactions.push({ post, user, reaction });
      save();
      return countOf(post);
    },
    async counts() {
      return new Map(data.posts.map((p) => [p.id, countOf(p.id)]));
    },
    async mine(user) {
      const out = new Map<string, NewsReaction[]>();
      for (const r of data.reactions)
        if (r.user === user)
          out.set(r.post, [...(out.get(r.post) ?? []), r.reaction]);
      return out;
    },
  };
}
