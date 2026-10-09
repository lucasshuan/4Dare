"use server";
// The Workshop's changes: suggesting, voting and the curators' decisions.
import { getLocale } from "next-intl/server";
import { GameError, LANGS, type Lang } from "@/game/types";
import { getBackend } from "./backend";
import type { WorkshopCheck } from "./community-contract";
import { fail, ok, type Result } from "./contract";
import { publishWorkshopNews } from "./news";
import { allow } from "./rate-limit";
import { approve, markReview, refuse, suggest, voteOn } from "./workshop";

async function run<T>(work: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await work());
  } catch (e) {
    if (e instanceof GameError) return fail(e.code);
    console.error("[workshop]", e);
    return fail("unknown");
  }
}

async function paced(key: string, max: number) {
  const me = await getBackend().auth.identity("en");
  if (!allow(`${key}:${me.id}`, max, 60_000))
    throw new GameError("rate_limited");
}

const pageLang = async (): Promise<Lang> => {
  const l = await getLocale();
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
};

/** Sends a suggestion for votes: its id, or what blocks it. */
export async function sendSuggestion(
  draft: unknown,
  translations: unknown,
): Promise<Result<{ id: string | null; checks: WorkshopCheck[] }>> {
  return run(async () => {
    await paced("suggest", 6);
    return suggest(draft, translations, await pageLang());
  });
}

/** true wants it, false doesn't fit, null takes the vote back; the counts after it. */
export async function voteSuggestion(
  id: string,
  vote: boolean | null,
): Promise<Result<{ yes: number; no: number }>> {
  return run(async () => {
    await paced("vote", 40);
    return voteOn(id, vote);
  });
}

export async function approveSuggestion(
  id: string,
  translations: unknown,
): Promise<Result<string>> {
  return run(async () => {
    const live = await approve(id, translations);
    await publishWorkshopNews(live).catch((e: unknown) =>
      console.warn("[workshop] news not written:", e),
    );
    return live.bankId;
  });
}

export async function refuseSuggestion(
  id: string,
  reason: string,
): Promise<Result> {
  return run(() => refuse(id, reason));
}

export async function reviewSuggestion(id: string): Promise<Result> {
  return run(() => markReview(id));
}
