// What goes under the hammer: the server reads a language's deck (known
// characters with a picture and a gosto) and draws each round's lots from it.
// Pure: the deck, the room's gostos and the dice come in.
//
// The draw picks the gosto first, with the same weight for each one the room
// left on, then the character, weighted by fame: a deck drawn straight from
// the most popular would be all footballers and politicians.
import type { Gosto } from "../gostos";
import type { BankExtra } from "./bank";

/** A character of a language's deck: library id, gostos, rank by fame (1 = the best known). */
export interface PoolCard {
  id: string;
  gostos: Gosto[];
  rank: number;
}

/** A lot as drawn: a library character, or an extra from the bank. */
export type DrawnLot =
  | { kind: "char"; id: string; gosto: Gosto; star: boolean }
  | { kind: "extra"; extra: BankExtra };

/** Every fourth lot is an extra (while the bank has some). */
const EXTRA_EVERY = 4;
/** Every fifth lot, from the first, is one of the language's best known. */
const STAR_EVERY = 5;
/** "Best known": among the language's first this many. */
export const STAR_RANK = 50;
/** A gosto with fewer cards than this weighs less (its share of a full one). */
const FULL_GOSTO = 40;
/** A room needs this many characters in its gostos to start (or the whole deck, if smaller). */
export const MIN_POOL = 60;
/** The deck: a language's best known this many; past them, characters get hard to place. */
export const POOL_MAX = 1000;

/** The characters of the deck the room's gostos let in. */
export function roomPool(pool: readonly PoolCard[], on: readonly Gosto[]) {
  return pool.filter((c) => c.gostos.some((g) => on.includes(g)));
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
 * fifth, never two of the same gosto in a row.
 */
export function drawLots(
  pool: readonly PoolCard[],
  o: {
    on: readonly Gosto[];
    count: number;
    extras: readonly BankExtra[];
    used: Set<string>;
  },
  random: () => number,
): DrawnLot[] {
  const byGosto = new Map<Gosto, PoolCard[]>();
  for (const c of pool)
    for (const g of c.gostos) {
      if (!o.on.includes(g)) continue;
      const list = byGosto.get(g);
      if (list) list.push(c);
      else byGosto.set(g, [c]);
    }
  const lots: DrawnLot[] = [];
  let last: Gosto | null = null;
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
    const free = (g: Gosto) =>
      (byGosto.get(g) ?? []).filter((c) => !o.used.has(c.id));
    const open = o.on.filter((g) => free(g).length);
    const gostos = open.filter((g) => g !== last);
    const g = weighted(
      gostos.length ? gostos : open,
      (k) => Math.min(1, (byGosto.get(k)?.length ?? 0) / FULL_GOSTO),
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
    lots.push({ kind: "char", id: c.id, gosto: g, star: stars.length > 0 });
  }
  return lots;
}
