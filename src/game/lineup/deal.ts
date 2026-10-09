// What goes under the hammer: the server reads a language's deck (known
// characters with a picture and a taste) and draws each round's lots from it.
// Pure: the deck, the room's tastes and the dice come in.
//
// The draw picks the taste first, with the same weight for each one the room
// left on, then the character, weighted by fame: a deck drawn straight from
// the most popular would be all footballers and politicians.
import { REACH_MAX, type Taste, tasteReach } from "../tastes";
import type { BankExtra } from "./bank";

/** A character of a language's deck: library id, tastes, rank by fame (1 = the best known). */
export interface PoolCard {
  id: string;
  tastes: Taste[];
  rank: number;
}

/** A lot as drawn: a library character, or an extra from the bank. */
export type DrawnLot =
  | { kind: "char"; id: string; taste: Taste; star: boolean }
  | { kind: "extra"; extra: BankExtra };

/** Every fourth lot is an extra (while the bank has some). */
const EXTRA_EVERY = 4;
/** Every fifth lot, from the first, is one of the language's best known. */
const STAR_EVERY = 5;
/** "Best known": among the language's first this many. */
export const STAR_RANK = 50;
/** A taste with fewer cards than this weighs less (its share of a full one). */
const FULL_TASTE = 40;
/** A room needs this many characters in its tastes to start (or the whole deck, if smaller). */
export const MIN_POOL = 60;
/** The deck: a language's best known this many; past them, characters get hard to place. A room that drops tastes reaches deeper into the rest (tasteReach). */
export const POOL_MAX = 1000;
/**
 * Each taste also brings its own best known this many, however far down the
 * language's list: the famous few (footballers, presidents) crowd games and
 * cartoons out of the first thousand, yet Link is easier for a gamer than a tennis player.
 */
export const TASTE_POOL = 100;

/**
 * The deck out of a language's characters, best known first: the first
 * `top`, and each taste's first `perTaste`; ranked again in that order.
 */
export function deckOf(
  known: readonly { id: string; tastes: Taste[] }[],
  top = POOL_MAX,
  perTaste = TASTE_POOL,
): PoolCard[] {
  const seen = new Map<Taste, number>();
  return known
    .filter((c, i) => {
      let keep = i < top;
      for (const g of c.tastes) {
        const n = (seen.get(g) ?? 0) + 1;
        seen.set(g, n);
        if (n <= perTaste) keep = true;
      }
      return keep;
    })
    .map((c, i) => ({ id: c.id, tastes: c.tastes, rank: i + 1 }));
}

/** The deck as the store keeps it, best known first: as deep as any room reaches. */
export const DECK_TOP = Math.round(POOL_MAX * REACH_MAX);
export const DECK_PER_TASTE = Math.round(TASTE_POOL * REACH_MAX);

/**
 * A room's deck out of the store's (deckOf with DECK_TOP and DECK_PER_TASTE):
 * the cards with a taste the room kept, among the language's best known
 * POOL_MAX, or among a kept taste's own best known TASTE_POOL, both times
 * its reach. The store's first DECK_TOP are the language's best known in
 * order, and each taste's first DECK_PER_TASTE are its own, so both cuts
 * read the same as on the whole library.
 */
export function roomDeck<T extends { tastes: readonly Taste[] }>(
  deck: readonly T[],
  off: readonly Taste[],
): T[] {
  const reach = tasteReach(off);
  const top = Math.round(POOL_MAX * reach);
  const per = Math.round(TASTE_POOL * reach);
  const seen = new Map<Taste, number>();
  return deck.filter((c, i) => {
    let keep = false;
    for (const g of c.tastes) {
      const n = (seen.get(g) ?? 0) + 1;
      seen.set(g, n);
      if (!off.includes(g) && (i < top || n <= per)) keep = true;
    }
    return keep;
  });
}

function weighted<T>(
  items: T[],
  weight: (t: T) => number,
  random: () => number,
) {
  const w = items.map((t) => Math.max(0, weight(t)));
  let roll = random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    roll -= w[i];
    if (roll < 0) return items[i];
  }
  return items.at(-1);
}

/**
 * `count` lots in table order, none of `used` (filled as it goes, so rounds
 * of one match never repeat a card). An extra every fourth lot, a star every
 * fifth, never two of the same taste in a row.
 */
export function drawLots(
  pool: readonly PoolCard[],
  o: {
    on: readonly Taste[];
    count: number;
    extras: readonly BankExtra[];
    used: Set<string>;
  },
  random: () => number,
): DrawnLot[] {
  const byTaste = new Map<Taste, PoolCard[]>();
  for (const c of pool)
    for (const g of c.tastes) {
      if (!o.on.includes(g)) continue;
      const list = byTaste.get(g);
      if (list) list.push(c);
      else byTaste.set(g, [c]);
    }
  const lots: DrawnLot[] = [];
  let last: Taste | null = null;
  for (let i = 0; i < o.count; i++) {
    if (i % EXTRA_EVERY === EXTRA_EVERY - 1) {
      const left = o.extras.filter((x) => !o.used.has(`x:${x.id}`));
      const x = left[Math.floor(random() * left.length)];
      if (x) {
        o.used.add(`x:${x.id}`);
        lots.push({ kind: "extra", extra: x });
        continue;
      }
    }
    const free = (g: Taste) =>
      (byTaste.get(g) ?? []).filter((c) => !o.used.has(c.id));
    const open = o.on.filter((g) => free(g).length);
    const tastes = open.filter((g) => g !== last);
    const g = weighted(
      tastes.length ? tastes : open,
      (k) => Math.min(1, (byTaste.get(k)?.length ?? 0) / FULL_TASTE),
      random,
    );
    if (!g) {
      // the deck ran dry: whatever extra is left
      const x = o.extras.find((e) => !o.used.has(`x:${e.id}`));
      if (!x) break;
      o.used.add(`x:${x.id}`);
      lots.push({ kind: "extra", extra: x });
      continue;
    }
    const cards = free(g);
    const star = i % STAR_EVERY === 0;
    const stars = star ? cards.filter((c) => c.rank <= STAR_RANK) : [];
    const c = weighted(
      stars.length ? stars : cards,
      (k) => 1 / Math.sqrt(k.rank),
      random,
    );
    if (!c) break;
    o.used.add(c.id);
    last = g;
    lots.push({ kind: "char", id: c.id, taste: g, star: stars.length > 0 });
  }
  return lots;
}
