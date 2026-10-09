"use server";
// The news page's one change: a reaction put or taken back.
import { GameError } from "@/game/types";
import { getBackend } from "./backend";
import type { NewsReactionKey } from "./community-contract";
import { fail, ok, type Result } from "./contract";
import { react } from "./news";
import { allow } from "./rate-limit";

/** Puts or takes back a reaction on a post; its counts after it. */
export async function reactToNews(
  postId: string,
  reaction: NewsReactionKey,
): Promise<Result<Partial<Record<NewsReactionKey, number>>>> {
  try {
    const me = await getBackend().auth.identity("en");
    if (me.isGuest) throw new GameError("sign_in_needed");
    if (!allow(`news-react:${me.id}`, 40, 60_000))
      throw new GameError("rate_limited");
    return ok(await react(postId, reaction, me.id));
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[news]", e);
    return fail("unknown");
  }
}
