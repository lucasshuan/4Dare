// Character autocomplete that runs in memory, in the browser: one download per
// language (cached), then every keystroke is a scan over pre-normalised keys,
// well under a millisecond for ~8k characters. No server round trip per key.
import { normalizeName } from "./match";
import type { CardView, Character } from "./types";

/**
 * One searchable character, as compact arrays to keep the download small:
 * [id, name, origin, imageUrl, nameKey, otherKeys, aliases]. `nameKey` is the
 * normalised name; `otherKeys` holds the name's words and the aliases,
 * normalised, each preceded by a space (" darth vader lordvader"); `aliases`
 * are the aliases as written, one per key, for the row to show the one typed.
 * A search hit carries the name it shows in `name` (see `shownName`).
 */
export type SearchItem = [
  id: string,
  name: string,
  origin: string | null,
  imageUrl: string | null,
  nameKey: string,
  otherKeys: string,
  /** Missing in a library downloaded before aliases were shown. */
  aliases?: string[],
];

export interface SearchResult {
  id: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
}

const WORDS = /[\s\-‐–—・·.,:;!?/()（）「」『』&]+/u;

/** Builds the item on the server, so browsers never normalise thousands of names. */
export function toSearchItem(c: {
  id: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  aliases: string[];
}): SearchItem {
  const nameKey = normalizeName(c.name);
  const others = new Set<string>();
  for (const word of c.name.split(WORDS)) others.add(normalizeName(word));
  const aliases: string[] = [];
  const seen = new Set([nameKey]);
  for (const alias of c.aliases) {
    const key = normalizeName(alias);
    others.add(key);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
  }
  others.delete("");
  others.delete(nameKey);
  const otherKeys = [...others].map((key) => ` ${key}`).join("");
  return [c.id, c.name, c.origin, c.imageUrl, nameKey, otherKeys, aliases];
}

/**
 * How well the normalised query `q` finds `name`, lower is better: exact,
 * start, start of a word, inside. Null when it doesn't. Words count only
 * for the character's own name.
 */
function nameRank(name: string, key: string, q: string, words: boolean) {
  if (key === q) return 0;
  if (key.startsWith(q)) return 2;
  if (words && name.split(WORDS).some((w) => normalizeName(w).startsWith(q)))
    return 3;
  if (key.includes(q)) return 5;
  return null;
}

/** `shownName` for a query already normalised. */
function shownFor(name: string, aliases: readonly string[], q: string) {
  const own = nameRank(name, normalizeName(name), q, true);
  let best = name;
  let rank = own ?? Number.POSITIVE_INFINITY;
  for (const alias of aliases) {
    const found = nameRank(alias, normalizeName(alias), q, false);
    // after the name at each level: exact 1, start 4, inside 7
    const r = found === null ? null : found === 0 ? 1 : found + 2;
    if (r !== null && r < rank) {
      best = alias;
      rank = r;
    }
  }
  return best;
}

/**
 * The name a character shows for `query`: the one of its names the query
 * fits best (exact, start, a word's start, inside), its own on a tie, the
 * first listed among aliases. A whole alias beats the start of the name
 * ("goku" shows "Goku", not "Son Goku"). So "Loira do Banheiro" shows
 * itself, not "Maria Sangrenta", and "vader" still shows "Darth Vader".
 * One name per character, never a row per alias.
 */
export function shownName(
  name: string,
  aliases: readonly string[],
  query: string,
): string {
  const q = normalizeName(query);
  return q ? shownFor(name, aliases, q) : name;
}

/** The item under the name it shows for `query` (see `shownName`). */
export const shownItem = (item: SearchItem, query: string): SearchItem =>
  shown(item, normalizeName(query));

/** `shownItem` for a query already normalised. */
function shown(item: SearchItem, q: string): SearchItem {
  const name = shownFor(item[1], item[6] ?? [], q);
  if (name === item[1]) return item;
  const copy: SearchItem = [...item];
  copy[1] = name;
  return copy;
}

/**
 * `c` under the name the search shows for `query` (one of its aliases, or
 * its own), so a pick keeps the name the player chose. Its own name joins
 * the aliases, so guesses still hit it.
 */
export function knownAs(c: Character, query: string): Character {
  const name = shownName(c.name, c.aliases, query);
  if (name === c.name) return c;
  return {
    ...c,
    name,
    aliases: [c.name, ...c.aliases.filter((alias) => alias !== name)],
  };
}

/** 0 exact name, 1 name starts with q, 2 a word or alias starts with q, 3 contains q, -1 no match. */
function tier(item: SearchItem, q: string, spaced: string): number {
  const name = item[4];
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  const others = item[5];
  if (others.includes(spaced)) return 2;
  if (name.includes(q) || others.includes(q)) return 3;
  return -1;
}

const toResult = (item: SearchItem): SearchResult => ({
  id: item[0],
  name: item[1],
  origin: item[2],
  imageUrl: item[3],
});

/** Last query per item list: typing one more letter only rescans what still matched. */
const narrowing = new WeakMap<SearchItem[], { q: string; hits: number[] }>();

/**
 * Best `limit` matches for `query`, as items. `items` must be sorted by
 * popularity (most popular first): within a tier, earlier items win.
 */
export function searchMatches(
  items: SearchItem[],
  query: string,
  limit: number,
): SearchItem[] {
  const q = normalizeName(query);
  if (!q) return items.slice(0, limit);
  const spaced = ` ${q}`;
  const previous = narrowing.get(items);
  const candidates =
    previous && q.startsWith(previous.q) ? previous.hits : null;
  const tiers: SearchItem[][] = [[], [], [], []];
  const hits: number[] = [];
  const visit = (index: number) => {
    const item = items[index];
    const t = tier(item, q, spaced);
    if (t < 0) return;
    hits.push(index);
    if (tiers[t].length < limit) tiers[t].push(item);
  };
  if (candidates) for (const index of candidates) visit(index);
  else for (let index = 0; index < items.length; index++) visit(index);
  narrowing.set(items, { q, hits });
  return tiers
    .flat()
    .slice(0, limit)
    .map((item) => shown(item, q));
}

/** Best `limit` matches for `query` (see `searchMatches`). */
export function searchItems(
  items: SearchItem[],
  query: string,
  limit: number,
): SearchResult[] {
  return searchMatches(items, query, limit).map(toResult);
}

/**
 * The character whose name is `name` once normalised (accents, case, kana,
 * a leading article), the most popular one when several share it; else the
 * one with that alias, under it. Single words of a longer name don't count:
 * "Vader" is not Darth Vader.
 */
export function exactMatch(
  items: readonly SearchItem[],
  name: string,
): SearchItem | null {
  const key = normalizeName(name);
  if (!key) return null;
  const named = items.find((item) => item[4] === key);
  if (named) return named;
  const spaced = ` ${key}`;
  for (const item of items) {
    if (!item[5].includes(spaced)) continue;
    const alias = item[6]?.find((a) => normalizeName(a) === key);
    if (alias) return shown(item, key);
  }
  return null;
}

/**
 * Where the typed `query` sits in `name` (UTF-16 offsets, end excluded), with
 * the same folding as the search, so "homem" marks "Homem" and "leao" marks
 * "Leão". Null when the row matched through an alias it doesn't show.
 */
export function matchRange(
  name: string,
  query: string,
): [start: number, end: number] | null {
  const q = normalizeName(query);
  if (!q) return null;
  let folded = "";
  const from: number[] = []; // folded char → offset of its source char in `name`
  const to: number[] = []; // folded char → offset just after its source char
  let offset = 0;
  for (const char of name) {
    const f = normalizeName(char);
    for (let k = 0; k < f.length; k++) {
      from.push(offset);
      to.push(offset + char.length);
    }
    folded += f;
    offset += char.length;
  }
  const at = folded.indexOf(q);
  if (at < 0) return null;
  return [from[at], to[at + q.length - 1]];
}

/** A search item as the card shows it. */
export const toCardView = (item: SearchItem): CardView => ({
  characterId: item[0],
  name: item[1],
  origin: item[2],
  imageUrl: item[3],
});

/**
 * What the pick card holds; "whatever is on the card is the pick":
 * - `typing`: a name being typed while the search has rows; `preview` is the
 *   highlighted row (its picture shows as a ghost), null with no highlight;
 * - `picked`: a library character (a row, a hand card, Random, an exact name
 *   on blur, or restored from the draft), with its cover or another picture;
 * - `new`: a name the search doesn't know ("New!"), with its uploaded picture.
 */
export type CardContent =
  | { kind: "empty" }
  | { kind: "typing"; text: string; preview: SearchItem | null }
  | {
      kind: "picked";
      card: CardView;
      via: "list" | "hand" | "random" | "exact" | "restore";
      /** Another picture of the character, chosen in the tray or sent for it: this match only. */
      picture?: string;
      /** Restored from a draft the hand or the dice had filled (via says how otherwise). */
      suggested?: true;
    }
  | { kind: "new"; name: string; imageUrl: string | null; uploading: boolean };

/** The text the card's name field shows for `content`. */
export function cardText(content: CardContent): string {
  switch (content.kind) {
    case "empty":
      return "";
    case "typing":
      return content.text;
    case "picked":
      return content.card.name;
    case "new":
      return content.name;
  }
}

/** The name field: the card's content plus the open list (rows, highlight). */
export interface CardField {
  content: CardContent;
  /** At most the rows shown; empty when the search found nothing. */
  rows: SearchItem[];
  /** Index of the highlighted row, -1 for none. */
  highlight: number;
  /** The list is showing (rows, or the "not in this theme yet" line). */
  open: boolean;
}

export type CardEvent =
  /** A keystroke: the new text and the search's rows for it. */
  | { type: "input"; text: string; rows: SearchItem[] }
  /** Rows that arrived late (the index finished loading) for the same text. */
  | { type: "rows"; rows: SearchItem[] }
  | { type: "move"; by: 1 | -1 }
  | { type: "hover"; index: number }
  /** A click on a row. */
  | { type: "choose"; index: number }
  | { type: "enter"; exact: SearchItem | null }
  | { type: "escape" }
  | { type: "blur"; exact: SearchItem | null };

export const closedField = (content: CardContent): CardField => ({
  content,
  rows: [],
  highlight: -1,
  open: false,
});

const asNew = (previous: CardContent, name: string): CardContent =>
  previous.kind === "new"
    ? { ...previous, name }
    : { kind: "new", name, imageUrl: null, uploading: false };

function typed(
  previous: CardContent,
  text: string,
  rows: SearchItem[],
): CardField {
  if (!text.trim()) return closedField({ kind: "empty" });
  if (!rows.length)
    return { content: asNew(previous, text), rows, highlight: -1, open: true };
  return {
    content: { kind: "typing", text, preview: rows[0] },
    rows,
    highlight: 0,
    open: true,
  };
}

const pick = (item: SearchItem, via: "list" | "exact"): CardField =>
  closedField({ kind: "picked", card: toCardView(item), via });

/** Settles a typed name: an exact match is picked, anything else is new. */
function settle(field: CardField, exact: SearchItem | null): CardField {
  const text = cardText(field.content);
  if (exact) return pick(exact, "exact");
  if (!text.trim()) return closedField({ kind: "empty" });
  return closedField(asNew(field.content, text));
}

const highlighted = (field: CardField, index: number): CardField => {
  if (field.content.kind !== "typing" && field.content.kind !== "new")
    return field;
  const text = cardText(field.content);
  return {
    ...field,
    highlight: index,
    open: true,
    content: { kind: "typing", text, preview: field.rows[index] ?? null },
  };
};

/**
 * The card's state machine, pure: rows → typing with the highlighted row as
 * the preview; no rows → "New!"; Enter or a click → the highlighted row; blur
 * → an exact name is picked, no highlight makes it new, else the preview stays.
 */
export function cardStep(field: CardField, event: CardEvent): CardField {
  const { content, rows } = field;
  switch (event.type) {
    case "input":
      return typed(content, event.text, event.rows);
    case "rows":
      if (!field.open || (content.kind !== "typing" && content.kind !== "new"))
        return field;
      return typed(content, cardText(content), event.rows);
    case "move": {
      if (content.kind !== "typing" && content.kind !== "new") return field;
      if (!rows.length)
        return cardText(content).trim() && !field.open
          ? { ...field, open: true }
          : field;
      if (!field.open) return { ...field, open: true };
      const next =
        event.by > 0
          ? Math.min(field.highlight + 1, rows.length - 1)
          : Math.max(field.highlight - 1, -1);
      return highlighted(field, next);
    }
    case "hover":
      return event.index >= 0 && event.index < rows.length
        ? highlighted(field, event.index)
        : field;
    case "choose":
      return rows[event.index] ? pick(rows[event.index], "list") : field;
    case "enter":
      if (content.kind === "typing" && rows[field.highlight])
        return pick(rows[field.highlight], "list");
      if (content.kind !== "typing" && content.kind !== "new")
        return { ...field, open: false };
      return settle(field, event.exact);
    case "escape":
      return field.open ? { ...field, open: false } : field;
    case "blur":
      if (content.kind === "typing") {
        if (event.exact || field.highlight < 0)
          return settle(field, event.exact);
        return { ...field, open: false };
      }
      if (content.kind === "new" && event.exact)
        return settle(field, event.exact);
      return { ...field, open: false };
  }
}

const THUMB_WIDTHS = [60, 120, 250, 330, 500];

/**
 * A smaller copy of a library picture for list rows: Wikimedia thumbnails in a
 * standard width, AniList's medium size. Anything else is returned unchanged.
 */
export function thumbUrl(url: string | null, width: number): string | null {
  if (!url) return url;
  if (
    url.startsWith("https://upload.wikimedia.org/") &&
    url.includes("/thumb/")
  ) {
    const size = THUMB_WIDTHS.find((w) => w >= width) ?? 500;
    return url.replace(/\/\d+px-([^/]+)$/, `/${size}px-$1`);
  }
  if (url.startsWith("https://s4.anilist.co/"))
    return url.replace("/large/", "/medium/");
  return url;
}
