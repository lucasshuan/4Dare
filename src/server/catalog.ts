import "server-only";
import { normalizeName } from "@/game/match";
import type { Taste } from "@/game/tastes";
import { LANGS, type Lang } from "@/game/types";
import { getBackend } from "./backend";
import type { CatalogRow } from "./backend/community-types";
import { entryId } from "./backend/seed-format";
import type {
  LibraryCard,
  LibraryCounts,
  LibraryNeed,
  LibraryPage,
  LibrarySort,
} from "./community-contract";
import type { PersonRef } from "./contract";
import { person } from "./profiles";

/** Rows asked for per read (PostgREST may cap pages at 1000). */
const PAGE = 1000;
/** How long one read serves before a fresh one starts behind it. */
const TTL = 5 * 60_000;
export const PAGE_SIZE = 36;

interface Catalog {
  rows: CatalogRow[];
  byId: Map<string, CatalogRow>;
  /** Each row's name, work and aliases folded, word by word, for search. */
  hay: string[];
  /** Each row's folded name, for ranking a search. */
  keys: string[];
  counts: Omit<LibraryCounts, "all">;
}

/** Added by hand or by a player, and not curated yet. */
const unreviewedRow = (r: CatalogRow) =>
  r.id.startsWith("hand-") || r.id.startsWith("u-");

const words = (text: string) =>
  text
    .split(/[\s\-‐–—・·.,:;!?/()（）「」『』&]+/u)
    .map(normalizeName)
    .filter(Boolean);

async function read(lang: Lang): Promise<Catalog> {
  const { library } = getBackend();
  const rows: CatalogRow[] = [];
  for (;;) {
    const page = await library.catalogPage(lang, rows.at(-1)?.id ?? null, PAGE);
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  const missing = new Map<Lang, number>();
  let nopic = 0;
  let unreviewed = 0;
  const hay: string[] = [];
  const keys: string[] = [];
  for (const r of rows) {
    if (!r.imageUrl) nopic += 1;
    if (unreviewedRow(r)) unreviewed += 1;
    for (const l of LANGS)
      if (!r.langs.includes(l)) missing.set(l, (missing.get(l) ?? 0) + 1);
    keys.push(normalizeName(r.name));
    hay.push(
      ` ${[r.name, r.origin ?? "", ...r.aliases, ...r.otherNames]
        .flatMap((t) => [normalizeName(t), ...words(t)])
        .join(" ")}`,
    );
  }
  // the reader's own language first only when it lacks some, else the one that lacks most
  const lacking = [...missing.entries()]
    .filter(([l]) => l !== lang)
    .sort((a, b) => b[1] - a[1])[0];
  return {
    rows,
    byId: new Map(rows.map((r) => [r.id, r])),
    hay,
    keys,
    counts: {
      nopic,
      unreviewed,
      missing: lacking ? { lang: lacking[0], n: lacking[1] } : null,
    },
  };
}

const cache = new Map<Lang, { at: number; catalog: Catalog }>();
const loading = new Map<Lang, Promise<Catalog>>();

function load(lang: Lang): Promise<Catalog> {
  let p = loading.get(lang);
  if (!p) {
    p = read(lang)
      .then((catalog) => {
        cache.set(lang, { at: Date.now(), catalog });
        return catalog;
      })
      .finally(() => loading.delete(lang));
    loading.set(lang, p);
  }
  return p;
}

/**
 * A language's catalog: the last read while a fresh one loads behind it.
 * `fresh` waits for a read that started after now (a character just made).
 */
export async function catalog(lang: Lang, fresh = false): Promise<Catalog> {
  const hit = cache.get(lang);
  if (!hit || fresh) return load(lang);
  if (Date.now() - hit.at > TTL) void load(lang).catch(() => {});
  return hit.catalog;
}

/** Drops this instance's catalogs, after a change it made (a new character, a nickname). */
export function invalidateCatalog() {
  for (const lang of LANGS) {
    const hit = cache.get(lang);
    if (hit) hit.at = 0;
  }
}

/** The app's id of a catalog row in `lang`. */
export const appId = (lang: Lang, id: string) =>
  id.startsWith("u-") ? id : entryId(lang, id);

/** The accounts among `ids`, as cards name them. */
export async function peopleOf(
  ids: (string | null)[],
  lang: Lang,
): Promise<Map<string, PersonRef>> {
  const wanted = [...new Set(ids.filter((id): id is string => !!id))];
  if (!wanted.length) return new Map();
  const profiles = await getBackend().profiles.byIds(wanted);
  return new Map(profiles.map((p) => [p.id, person(p, lang)]));
}

export interface BrowseQuery {
  q: string;
  taste: Taste | null;
  sort: LibrarySort;
  need: LibraryNeed | null;
  offset: number;
}

/** One page of the catalog as the characters page asks for it. */
export async function browse(
  query: BrowseQuery,
  lang: Lang,
): Promise<LibraryPage> {
  const cat = await catalog(lang);
  const terms = words(query.q);
  const needLang = cat.counts.missing?.lang;
  const hits: { row: CatalogRow; score: number }[] = [];
  cat.rows.forEach((row, i) => {
    if (query.taste && row.taste !== query.taste) return;
    if (query.sort === "nopic" && row.imageUrl) return;
    if (query.need === "missing" && (!needLang || row.langs.includes(needLang)))
      return;
    if (query.need === "unreviewed" && !unreviewedRow(row)) return;
    if (terms.length && !terms.every((t) => cat.hay[i].includes(t))) return;
    let score = 0;
    if (terms.length) {
      const whole = terms.join("");
      const key = cat.keys[i];
      score =
        key === whole
          ? 4
          : key.startsWith(whole)
            ? 3
            : key.includes(whole)
              ? 2
              : 1;
    }
    hits.push({ row, score });
  });
  const byFame = (a: CatalogRow, b: CatalogRow) =>
    (b.popularity ?? -1) - (a.popularity ?? -1) ||
    b.pictures - a.pictures ||
    (a.id < b.id ? -1 : 1);
  hits.sort((a, b) =>
    query.sort === "new"
      ? b.row.createdAt - a.row.createdAt || byFame(a.row, b.row)
      : b.score - a.score || byFame(a.row, b.row),
  );
  const slice = hits.slice(query.offset, query.offset + PAGE_SIZE);
  const people = await peopleOf(
    slice.map((h) => h.row.createdBy),
    lang,
  );
  const items = slice.map(
    ({ row }): LibraryCard => ({
      id: appId(lang, row.id),
      name: row.name,
      origin: row.origin,
      imageUrl: row.imageUrl,
      taste: row.taste,
      pictures: row.pictures,
      by: (row.createdBy && people.get(row.createdBy)) || null,
    }),
  );
  const end = query.offset + slice.length;
  return {
    items,
    total: hits.length,
    next: end < hits.length ? end : null,
    counts: { all: cat.rows.length, ...cat.counts },
  };
}
