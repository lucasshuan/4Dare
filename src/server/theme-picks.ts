import "server-only";
// What players picked for each theme in finished matches, for the pick
// screen: the "random" button draws among the characters people chose most
// for the theme being played, and the hand under the card shows them (with
// the theme's starters filling in while the history is thin).
import type { MatchRecord } from "@/game/record";
import { themeId } from "@/game/theme-id";
import type { Character, Lang } from "@/game/types";
import { entryId, parseEntryId } from "./backend/seed-format";
import type { CharacterDTO } from "./contract";

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

/**
 * A picked character's language-free id; null for what no store knows: the
 * clock's stand-ins, and a draft's name the server could not save in time.
 */
export function pickKey(characterId: string | null): string | null {
  if (
    !characterId ||
    characterId.startsWith("emergency-") ||
    characterId.startsWith("draft-")
  )
    return null;
  return parseEntryId(characterId)?.id ?? characterId;
}

/** Picks per theme, from match records (local mode keeps this in memory). */
export function tallyPicks(
  records: Iterable<MatchRecord>,
  into = new Map<string, Map<string, number>>(),
) {
  for (const m of records) {
    // Records saved before themeId existed only have the theme itself; a typed one has no themeId at all.
    const theme =
      m.themeId ?? (m.theme && m.theme.set !== null ? themeId(m.theme) : null);
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

/** A history pick and the character it is in one language. */
export interface RankedPick {
  pick: PopularPick;
  character: Character;
}

/**
 * The theme's history resolved into `lang`, heaviest first (ties by id, so
 * the order is stable). Characters missing in that language, and ones voted
 * out (weight 0), drop out. `resolveMany` turns app ids into the characters
 * that still exist in `lang`.
 */
export async function rankPopular(
  popular: PopularPick[],
  lang: Lang,
  resolveMany: (ids: string[]) => Promise<Character[]>,
): Promise<RankedPick[]> {
  // Library characters exist in every language; players' ones in one.
  const ids = popular.map((p) =>
    p.id.startsWith("u-") ? p.id : entryId(lang, p.id),
  );
  const found = new Map<string, Character>();
  for (const c of await resolveMany(ids)) {
    const key = pickKey(c.id);
    if (key && c.lang === lang) found.set(key, c);
  }
  return popular
    .filter((p) => found.has(p.id) && drawWeight(p) > 0)
    .sort((a, b) => drawWeight(b) - drawWeight(a) || a.id.localeCompare(b.id))
    .map((pick) => ({ pick, character: found.get(pick.id) as Character }));
}

/**
 * One character for `lang`, drawn among the RANDOM_POOL most picked that
 * exist in that language, weighted by how often each was picked. `taken`
 * (language-free keys already picked in this match) and `skip` (the one
 * drawn last) are left out of the draw but still count as history, so
 * "draw another" works whenever the first draw did. Null when the theme
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
  const eligible = (await rankPopular(popular, lang, resolveMany)).slice(
    0,
    RANDOM_POOL,
  );
  if (eligible.length < MIN_RANDOM_PICKS) return null;
  const free = eligible.filter((e) => !taken.has(e.pick.id));
  const fresh = free.filter((e) => e.pick.id !== skip);
  const pool = fresh.length > 0 ? fresh : free;
  if (pool.length === 0) return null;
  let roll = random() * pool.reduce((sum, e) => sum + drawWeight(e.pick), 0);
  for (const e of pool) {
    roll -= drawWeight(e.pick);
    if (roll < 0) return e.character;
  }
  return pool[pool.length - 1].character;
}

/** How many cards the hand route gives; the pick screen shows 5 of them. */
export const HAND_SIZE = 8;

/** A card of the pick screen's hand: how often it was picked for the theme, and liked. */
export type HandCard = CharacterDTO & { picks: number; likes: number };

/** GET /api/themes/[id]/picks?lang= */
export interface HandResponse {
  hand: HandCard[];
}

/** History worth showing over the hand-picked starters: picked twice or more, or liked. */
const hasSignal = (p: PopularPick) => p.picks >= 2 || (p.likes ?? 0) >= 1;

/**
 * The hand of suggestions under the pick card, in `lang`: what players really
 * picked and liked for the theme first, then the theme's starters (language-
 * free library ids, by position) to fill it; each character once, pictures
 * first, at most HAND_SIZE. Never mind what this match already picked: that
 * would hint who holds what, and the hand is the same for every viewer.
 */
export async function buildHand(
  popular: PopularPick[],
  starters: string[],
  lang: Lang,
  resolveMany: (ids: string[]) => Promise<Character[]>,
): Promise<HandCard[]> {
  const [ranked, named] = await Promise.all([
    rankPopular(popular, lang, resolveMany),
    starters.length
      ? resolveMany(starters.map((id) => entryId(lang, id)))
      : Promise.resolve([]),
  ]);
  const starter = new Map<string, Character>();
  for (const c of named) {
    const key = pickKey(c.id);
    if (key && c.lang === lang) starter.set(key, c);
  }
  const ordered = [
    ...ranked.filter((r) => hasSignal(r.pick)).map((r) => r.character),
    ...starters.flatMap((id) => starter.get(id) ?? []),
  ];
  const seen = new Set<string>();
  const unique = ordered.filter((c) => {
    const key = pickKey(c.id) ?? c.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const counts = new Map(popular.map((p) => [p.id, p]));
  return [
    ...unique.filter((c) => c.imageUrl),
    ...unique.filter((c) => !c.imageUrl),
  ]
    .slice(0, HAND_SIZE)
    .map((c) => {
      const p = counts.get(pickKey(c.id) ?? c.id);
      return {
        id: c.id,
        lang: c.lang,
        name: c.name,
        origin: c.origin,
        imageUrl: c.imageUrl,
        picks: p?.picks ?? 0,
        likes: p?.likes ?? 0,
      };
    });
}
