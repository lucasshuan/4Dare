import "server-only";
import { randomUUID } from "node:crypto";
import { gostosByRule } from "@/game/gostos";
import { normalizeName } from "@/game/match";
import { type Character, LANGS, type Lang } from "@/game/types";
import { entryId, libraryFor, parseEntryId } from "../seed-format";
import type { CharacterStore } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";
import { LOCAL_CHARACTERS, LOCAL_ORIGINS } from "./fixtures";

interface Row extends Character {
  popularity: number;
  /** Normalised name and aliases, for search. */
  keys: string[];
  /** Who made it and when (ms): players' characters only (missing in older files). */
  createdBy?: string;
  createdAt?: number;
}

const CREATED_FILE = "characters.json";
/** Library covers that moved off the fixture's picture: { "wd-Q302": url | null }, every language. */
const IMAGES_FILE = "character-images.json";

function toRow(
  c: Character,
  popularity: number,
  made?: Pick<Row, "createdBy" | "createdAt">,
): Row {
  return {
    ...c,
    ...made,
    popularity,
    keys: [c.name, ...c.aliases].map(normalizeName),
  };
}

/** Moved covers by library id. */
const swappedImages = () =>
  readJson<Record<string, string | null>>(IMAGES_FILE, {});

function loadLibrary(): Map<string, Row> {
  const rows = new Map<string, Row>();
  for (const lang of LANGS) {
    for (const { character, popularity } of libraryFor(
      LOCAL_CHARACTERS,
      LOCAL_ORIGINS,
      lang,
    ))
      rows.set(character.id, toRow(character, popularity));
  }
  for (const c of readJson<Row[]>(CREATED_FILE, []))
    rows.set(c.id, toRow(c, c.popularity, c));
  for (const [id, url] of Object.entries(swappedImages())) {
    for (const lang of LANGS) {
      const r = rows.get(entryId(lang, id));
      if (r) r.imageUrl = url;
    }
  }
  return rows;
}

function rank(row: Row, q: string): number {
  if (!q) return 0;
  if (row.keys[0] === q) return 4;
  if (row.keys[0].startsWith(q)) return 3;
  if (row.keys.some((k) => k.startsWith(q))) return 2;
  if (row.keys.some((k) => k.includes(q))) return 1;
  return -1;
}

const strip = ({
  keys: _k,
  popularity: _p,
  createdBy: _b,
  createdAt: _a,
  ...c
}: Row): Character => c;

/** The local store, plus what the local picture store needs to move covers. */
export type LocalCharacterStore = CharacterStore & {
  /** The cover now: a language-free library id ("wd-Q302") or a player's "u-…". */
  cover(id: string): string | null;
  /** Moves the cover, in every language. */
  setCover(id: string, url: string | null): void;
};

export function localCharacters(): LocalCharacterStore {
  const rows = processSingleton("characters", loadLibrary);
  const saveCreated = () =>
    writeJson(
      CREATED_FILE,
      [...rows.values()].filter((r) => r.id.startsWith("u-")),
    );

  return {
    async search(query, lang, limit) {
      const q = normalizeName(query);
      const hits: { row: Row; score: number }[] = [];
      for (const row of rows.values()) {
        if (row.lang !== lang) continue;
        const score = rank(row, q);
        if (score >= 0) hits.push({ row, score });
      }
      hits.sort(
        (a, b) => b.score - a.score || b.row.popularity - a.row.popularity,
      );
      return hits.slice(0, limit).map((h) => strip(h.row));
    },
    async getMany(ids, lang) {
      return ids.flatMap((id) => {
        const r = rows.get(id);
        return r && r.lang === lang ? [strip(r)] : [];
      });
    },
    async get(id) {
      const r = rows.get(id);
      return r ? strip(r) : null;
    },
    async create(input) {
      // A fixed id made already (a clock and a confirm racing): that one.
      const made = input.id ? rows.get(input.id) : undefined;
      if (made) return strip(made);
      const c: Character = {
        id: input.id ?? `u-${randomUUID()}`,
        lang: input.lang,
        name: input.name,
        origin: input.origin,
        imageUrl: input.imageUrl,
        aliases: [],
      };
      rows.set(
        c.id,
        toRow(c, 0, { createdBy: input.createdBy, createdAt: Date.now() }),
      );
      saveCreated();
      return c;
    },
    async extras(lang) {
      const created = [...rows.values()]
        .filter((r) => r.lang === lang && r.id.startsWith("u-"))
        .map(strip);
      const images: Record<string, string> = {};
      for (const [id, url] of Object.entries(swappedImages()))
        if (url) images[entryId(lang, id)] = url;
      return { created, images };
    },
    async randomPopular(lang: Lang, count) {
      const pool = [...rows.values()]
        .filter((r) => r.lang === lang)
        .sort(
          (a, b) =>
            Number(!!b.imageUrl) - Number(!!a.imageUrl) ||
            b.popularity - a.popularity,
        )
        .slice(0, 300);
      const picked: Character[] = [];
      while (pool.length && picked.length < count) {
        const i = Math.floor(Math.random() * pool.length);
        picked.push(strip(pool.splice(i, 1)[0]));
      }
      return picked;
    },
    async createdBy(playerId, limit) {
      return [...rows.values()]
        .filter((r) => r.id.startsWith("u-") && r.createdBy === playerId)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, limit)
        .map(strip);
    },
    // The starters live only in Supabase (whoami_theme_starters); the dev lab has fixtures.
    async starters() {
      return [];
    },
    async facts(ids, lang) {
      const keys = new Set(ids.map((id) => parseEntryId(id)?.id ?? id));
      return LOCAL_CHARACTERS.filter((c) => keys.has(c.id)).map((c) => ({
        id: c.id,
        category: c.category,
        work:
          LOCAL_ORIGINS.find((o) => o.id === c.origin)?.labels.en ?? c.origin,
        popularity: c.popularity?.[lang] ?? null,
        gostos: gostosByRule(c.origin, c.category),
      }));
    },
    // a few dozen characters, all well known
    async knownFloor() {
      return null;
    },
    cover(id) {
      if (id.startsWith("u-")) return rows.get(id)?.imageUrl ?? null;
      for (const lang of LANGS) {
        const r = rows.get(entryId(lang, id));
        if (r) return r.imageUrl;
      }
      return null;
    },
    setCover(id, url) {
      if (id.startsWith("u-")) {
        const r = rows.get(id);
        if (!r) return;
        r.imageUrl = url;
        saveCreated();
        return;
      }
      for (const lang of LANGS) {
        const r = rows.get(entryId(lang, id));
        if (r) r.imageUrl = url;
      }
      writeJson(IMAGES_FILE, { ...swappedImages(), [id]: url });
    },
  };
}
