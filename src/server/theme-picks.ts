import "server-only";
// How well each character fits a theme for one language's players: the pick
// screen's hand, the dice and the clock's fills all draw on this ranking.
// Three signals, each kept in the language it came from:
// - starters: picked by hand per theme (shared ones, plus a language's own
//   ranked among them); a head start that fades as the theme gathers history;
// - pickers: players who chose the character for the theme, each once; one
//   the hand or the dice offered counts half, since what is shown gets picked;
// - votes: "did it fit the theme?", asked after a draw and after a discovery.
// Another language's history counts a quarter: a cartoon travels, a
// country's celebrities don't, and each language's starters say whose are.
import type { Character, Lang } from "@/game/types";
import { entryId, parseEntryId } from "./backend/seed-format";
import type { ThemeStarter } from "./backend/types";
import type { CharacterDTO } from "./contract";

/** What a theme knows of one character in one language (table whoami_theme_stats). */
export interface PickStat {
  /** The same in every language: "wd-Q302", "al-40", "u-<uuid>". */
  id: string;
  lang: Lang;
  /** Players who chose it on their own. */
  picks: number;
  /** Players who chose it from the hand or the dice. */
  suggested: number;
  /** Players who said it fits the theme, or doesn't. */
  fits: number;
  misfits: number;
}

/** One player's verdict: did the character fit the theme? */
export interface FitVote {
  themeId: string;
  /** Language-free key (see pickKey). */
  characterId: string;
  voterId: string;
  /** The voter's language: the vote counts most for its players. */
  lang: Lang;
  fits: boolean;
}

/** A pick or a vote from another language, against one from the players' own. */
export const OTHER_LANGUAGE = 0.25;
/** A pick the hand or the dice offered, against one a player found on their own. */
export const SUGGESTED = 0.5;
/** The first starter's head start, in picks; the next ones get less (see headStart). */
export const HEAD_START = 8;
/** History (weighted picks) at which the starters' head start is halved. */
export const HEAD_START_FADE = 40;
/** A shared starter next to the language's own: these lead, those follow close. */
export const SHARED_STARTER = 0.8;
/** What a vote count starts from: [fits, misfits]. A starter is trusted more. */
const STARTER_FIT: [number, number] = [4, 1];
const OTHER_FIT: [number, number] = [2, 1];
/** Out of the hand and the dice: this many "no"s and a fit chance under a third. */
const VOTED_OUT = 3;

/** The head start of the starter at `position` (1 is the clearest fit): 8, 6.4, 5.3, 4.6... */
export const headStart = (position: number) =>
  HEAD_START / (1 + (position - 1) / 4);

/**
 * The starters' head starts for `lang` (null: every language alike, the
 * shared ones alone). A language with its own starters for the theme ranks
 * them first and the shared ones close behind, interleaved by position.
 */
export function startersFor(
  starters: readonly ThemeStarter[],
  lang: Lang | null,
): Map<string, number> {
  const own = lang ? starters.filter((s) => s.lang === lang) : [];
  const shared = starters.filter((s) => s.lang === "all");
  const out = new Map<string, number>();
  const add = (s: ThemeStarter, factor: number) => {
    const head = headStart(s.position) * factor;
    out.set(s.characterId, Math.max(out.get(s.characterId) ?? 0, head));
  };
  for (const s of own) add(s, 1);
  for (const s of shared) add(s, own.length ? SHARED_STARTER : 1);
  return out;
}

/** A character's standing in a theme for one language. */
export interface ThemeFit {
  /** Language-free key. */
  id: string;
  /** Its weight in the hand and the dice: higher fits better. */
  score: number;
  /** Players who chose it, in every language (shown on the hand). */
  picks: number;
  /** Players who said it fits, in every language (shown on the hand). */
  fits: number;
}

/**
 * The theme's characters for `lang`'s players, best first (ties by id, so
 * the order is stable); null weighs every language alike. A character's
 * score is how much it is chosen (picks, suggested ones at half, fits, the
 * starter's head start) times the square of its chance of fitting, a vote
 * count that starts from a prior: every "no" bites, every "yes" helps. The
 * starters' head start fades as the theme's history grows, so a character
 * players keep choosing and approving overtakes them. Characters voted out
 * (VOTED_OUT "no"s, a fit chance under a third) are left out.
 */
export function rankTheme(
  stats: readonly PickStat[],
  starters: readonly ThemeStarter[],
  lang: Lang | null,
): ThemeFit[] {
  const heads = startersFor(starters, lang);
  const sum = new Map<
    string,
    { picks: number; fits: number; misfits: number; shown: ThemeFit }
  >();
  let history = 0;
  for (const s of stats) {
    const w = lang === null || s.lang === lang ? 1 : OTHER_LANGUAGE;
    const picks = (s.picks + s.suggested * SUGGESTED) * w;
    history += picks;
    const into = sum.get(s.id) ?? {
      picks: 0,
      fits: 0,
      misfits: 0,
      shown: { id: s.id, score: 0, picks: 0, fits: 0 },
    };
    into.picks += picks;
    into.fits += s.fits * w;
    into.misfits += s.misfits * w;
    into.shown.picks += s.picks + s.suggested;
    into.shown.fits += s.fits;
    sum.set(s.id, into);
  }
  for (const id of heads.keys())
    if (!sum.has(id))
      sum.set(id, {
        picks: 0,
        fits: 0,
        misfits: 0,
        shown: { id, score: 0, picks: 0, fits: 0 },
      });
  const fade = HEAD_START_FADE / (HEAD_START_FADE + history);
  const out: ThemeFit[] = [];
  for (const [id, s] of sum) {
    const head = heads.get(id);
    const [a, b] = head === undefined ? OTHER_FIT : STARTER_FIT;
    const fit = (s.fits + a) / (s.fits + s.misfits + a + b);
    if (s.misfits >= VOTED_OUT && fit < 1 / 3) continue;
    const weight = s.picks + s.fits + (head ?? 0) * fade;
    if (weight <= 0) continue;
    out.push({ ...s.shown, score: weight * fit * fit });
  }
  return out.sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
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

/** How many of a theme's characters to read: plenty for the hand, the dice and their misses. */
export const STATS_FETCHED = 500;
/** How many of the ranking to look up in a language: some drop out (other language, deleted). */
export const RANKED_FETCHED = 100;
/** The draw is among this many of the best fits. */
export const RANDOM_POOL = 20;

/** A ranked character and the character it is in one language. */
export interface RankedCharacter {
  fit: ThemeFit;
  character: Character;
}

/**
 * The ranking's head (RANKED_FETCHED) as characters of `lang`, in order;
 * ones missing in that language drop out. `resolveMany` turns app ids into
 * the characters that still exist in `lang`.
 */
export async function resolveRanked(
  ranked: readonly ThemeFit[],
  lang: Lang,
  resolveMany: (ids: string[]) => Promise<Character[]>,
): Promise<RankedCharacter[]> {
  const head = ranked.slice(0, RANKED_FETCHED);
  if (head.length === 0) return [];
  // Library characters exist in every language; players' ones in one.
  const ids = head.map((f) =>
    f.id.startsWith("u-") ? f.id : entryId(lang, f.id),
  );
  const found = new Map<string, Character>();
  for (const c of await resolveMany(ids)) {
    const key = pickKey(c.id);
    if (key && c.lang === lang) found.set(key, c);
  }
  return head.flatMap((fit) => {
    const character = found.get(fit.id);
    return character ? [{ fit, character }] : [];
  });
}

/**
 * One character for `lang`, drawn among the RANDOM_POOL best fits that exist
 * in that language, weighted by score. `taken` (language-free keys already
 * picked in this match) and `skip` (the one drawn last) are left out of the
 * draw, so "draw another" works whenever the first draw did. Null when the
 * theme has no such character, or none is free.
 */
export async function drawFit(
  ranked: readonly ThemeFit[],
  lang: Lang,
  taken: Set<string>,
  skip: string | null,
  resolveMany: (ids: string[]) => Promise<Character[]>,
  random: () => number,
): Promise<Character | null> {
  const eligible = (await resolveRanked(ranked, lang, resolveMany)).slice(
    0,
    RANDOM_POOL,
  );
  const free = eligible.filter((e) => !taken.has(e.fit.id));
  const fresh = free.filter((e) => e.fit.id !== skip);
  const pool = fresh.length > 0 ? fresh : free;
  if (pool.length === 0) return null;
  let roll = random() * pool.reduce((sum, e) => sum + e.fit.score, 0);
  for (const e of pool) {
    roll -= e.fit.score;
    if (roll < 0) return e.character;
  }
  return pool[pool.length - 1].character;
}

/** How many cards the hand route gives; the pick screen shows 5 of them. */
export const HAND_SIZE = 8;

/** A card of the pick screen's hand: how many chose it for the theme, and said it fits. */
export type HandCard = CharacterDTO & { picks: number; fits: number };

/** GET /api/themes/[id]/picks?lang= */
export interface HandResponse {
  hand: HandCard[];
}

/**
 * The hand of suggestions under the pick card, in `lang`: the best fits,
 * pictures first, at most HAND_SIZE. Never mind what this match already
 * picked: that would hint who holds what, and the hand is the same for every
 * viewer.
 */
export async function buildHand(
  ranked: readonly ThemeFit[],
  lang: Lang,
  resolveMany: (ids: string[]) => Promise<Character[]>,
): Promise<HandCard[]> {
  const found = await resolveRanked(ranked, lang, resolveMany);
  return [
    ...found.filter((r) => r.character.imageUrl),
    ...found.filter((r) => !r.character.imageUrl),
  ]
    .slice(0, HAND_SIZE)
    .map(({ fit, character: c }) => ({
      id: c.id,
      lang: c.lang,
      name: c.name,
      origin: c.origin,
      imageUrl: c.imageUrl,
      picks: fit.picks,
      fits: fit.fits,
    }));
}
