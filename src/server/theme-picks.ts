import "server-only";
// What players picked for each theme in finished matches, for the pick
// screen's "random" button: it draws among the characters people chose most
// for the theme being played.
import type { MatchRecord } from "@/game/record";
import { themeId } from "@/game/theme-id";
import type { Character, Lang } from "@/game/types";
import { entryId, parseEntryId } from "./backend/seed-format";

/** One saved pick for the theme is enough to draw from. */
export const MIN_RANDOM_PICKS = 1;
/** The draw is among this many of the most picked characters. */
export const RANDOM_POOL = 20;
/** How many to read from the history: some drop out (other language, deleted). */
export const PICKS_FETCHED = 100;

export interface PopularPick {
  /** The same in every language: "wd-Q302", "al-40", "u-<uuid>". */
  id: string;
  picks: number;
  /** Players who drew it with the random button and said it fits the theme, or not. */
  likes?: number;
  dislikes?: number;
}

/**
 * How likely a character is to be drawn: picks and likes push it up, and
 * every "no" halves it, so a character that doesn't fit the theme soon drops
 * out of the pool.
 */
export const drawWeight = (p: PopularPick) =>
  (p.picks + (p.likes ?? 0)) * 0.5 ** (p.dislikes ?? 0);

/** One player's verdict on a drawn character, by theme. */
export interface PickFeedback {
  themeId: string;
  /** Language-free key (see pickKey). */
  characterId: string;
  userId: string;
  liked: boolean;
}

/** Likes and dislikes per theme and character, the last answer of each player counting once. */
export function tallyFeedback(answers: Iterable<PickFeedback>) {
  const out = new Map<
    string,
    Map<string, { likes: number; dislikes: number }>
  >();
  for (const a of answers) {
    const theme = out.get(a.themeId) ?? new Map();
    const counts = theme.get(a.characterId) ?? { likes: 0, dislikes: 0 };
    if (a.liked) counts.likes += 1;
    else counts.dislikes += 1;
    theme.set(a.characterId, counts);
    out.set(a.themeId, theme);
  }
  return out;
}

/** A picked character's language-free id; null for clock stand-ins that no store knows. */
export function pickKey(characterId: string | null): string | null {
  if (!characterId || characterId.startsWith("emergency-")) return null;
  return parseEntryId(characterId)?.id ?? characterId;
}

/** Picks per theme, from match records (local mode keeps this in memory). */
export function tallyPicks(
  records: Iterable<MatchRecord>,
  into = new Map<string, Map<string, number>>(),
) {
  for (const m of records) {
    // Records saved before themeId existed only have the theme itself.
    const theme = m.themeId ?? (m.theme ? themeId(m.theme) : null);
    if (!theme) continue;
    for (const p of m.players) {
      const key = p.autoPicked ? null : pickKey(p.characterId);
      if (!key) continue;
      const counts = into.get(theme) ?? new Map<string, number>();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      into.set(theme, counts);
    }
  }
  return into;
}

/** The most picked first, ties by id so the order is stable. */
export function topPicks(
  counts: Map<string, number> | undefined,
  limit: number,
): PopularPick[] {
  return [...(counts ?? [])]
    .map(([id, picks]) => ({ id, picks }))
    .sort((a, b) => b.picks - a.picks || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * One character for `lang`, drawn among the RANDOM_POOL most picked that
 * exist in that language, weighted by how often each was picked. `taken`
 * (language-free keys already picked in this match) and `skip` (the one
 * drawn last) are left out of the draw but still count as history, so
 * "draw another" works whenever the first draw did. `resolveMany` turns app
 * ids into the characters that still exist in `lang`. Null when the theme
 * has fewer than MIN_RANDOM_PICKS such characters, or none is free.
 */
export async function drawPopular(
  popular: PopularPick[],
  lang: Lang,
  taken: Set<string>,
  skip: string | null,
  resolveMany: (ids: string[]) => Promise<Character[]>,
  random: () => number,
): Promise<Character | null> {
  // Library characters exist in every language; players' ones in one.
  const ids = popular.map((p) =>
    p.id.startsWith("u-") ? p.id : entryId(lang, p.id),
  );
  const found = new Map<string, Character>();
  for (const c of await resolveMany(ids)) {
    const key = pickKey(c.id);
    if (key && c.lang === lang) found.set(key, c);
  }
  const eligible = popular
    .filter((p) => found.has(p.id) && drawWeight(p) > 0)
    .sort((a, b) => drawWeight(b) - drawWeight(a) || a.id.localeCompare(b.id))
    .slice(0, RANDOM_POOL);
  if (eligible.length < MIN_RANDOM_PICKS) return null;
  const free = eligible.filter((p) => !taken.has(p.id));
  const fresh = free.filter((p) => p.id !== skip);
  const pool = fresh.length > 0 ? fresh : free;
  if (pool.length === 0) return null;
  let roll = random() * pool.reduce((sum, p) => sum + drawWeight(p), 0);
  for (const p of pool) {
    roll -= drawWeight(p);
    if (roll < 0) return found.get(p.id) ?? null;
  }
  return found.get(pool[pool.length - 1].id) ?? null;
}
