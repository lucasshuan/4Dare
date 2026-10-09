import { describe, expect, it } from "vitest";
import { LANGS } from "@/game/types";
import { NEWS_POSTS } from "./news-posts";

describe("news posts", () => {
  it("have their own ids, not a Workshop one", () => {
    const ids = NEWS_POSTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).not.toMatch(/^workshop-[0-9a-f-]{36}$/);
  });

  it("list the newest day first", () => {
    const days = NEWS_POSTS.map((p) => p.at);
    for (const d of days) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(days).toEqual([...days].sort().reverse());
  });

  it("have every text in every language, and a path to go to", () => {
    for (const p of NEWS_POSTS) {
      for (const lang of LANGS) {
        expect(p.body[lang].trim(), `${p.id} body ${lang}`).not.toBe("");
        if (p.title) expect(p.title[lang].trim()).not.toBe("");
        if (p.action) expect(p.action.label[lang].trim()).not.toBe("");
      }
      if (p.action) expect(p.action.href.startsWith("/")).toBe(true);
    }
  });
});
