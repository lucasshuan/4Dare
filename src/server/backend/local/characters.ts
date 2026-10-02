import "server-only";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeName } from "@/game/match";
import { type Character, LANGS, type Lang } from "@/game/types";
import type { SeedCharacter } from "../seed-format";
import type { CharacterStore } from "../types";
import { processSingleton, readJson, writeJson } from "./disk";

interface Row extends Character {
  popularity: number;
  /** Normalised name and aliases, for search. */
  keys: string[];
}

const CREATED_FILE = "characters.json";
/** Pictures players swapped on library characters: { id: url }. */
const IMAGES_FILE = "character-images.json";

function toRow(c: Character, popularity: number): Row {
  return { ...c, popularity, keys: [c.name, ...c.aliases].map(normalizeName) };
}

function loadLibrary(): Map<string, Row> {
  const rows = new Map<string, Row>();
  for (const lang of LANGS) {
    let seed: SeedCharacter[] = [];
    try {
      const file = join(process.cwd(), "data", "characters", `${lang}.json`);
      seed = JSON.parse(readFileSync(file, "utf8")) as SeedCharacter[];
    } catch {
      seed = [];
    }
    for (const s of seed) {
      const { popularity, ...rest } = s;
      rows.set(s.id, toRow({ ...rest, lang }, popularity));
    }
  }
  for (const c of readJson<Row[]>(CREATED_FILE, []))
    rows.set(c.id, toRow(c, c.popularity));
  for (const [id, url] of Object.entries(
    readJson<Record<string, string>>(IMAGES_FILE, {}),
  )) {
    const r = rows.get(id);
    if (r) r.imageUrl = url;
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

const strip = ({ keys: _k, popularity: _p, ...c }: Row): Character => c;

export function localCharacters(): CharacterStore {
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
    async get(id) {
      const r = rows.get(id);
      return r ? strip(r) : null;
    },
    async create(input) {
      const c: Character = {
        id: `u-${randomUUID()}`,
        lang: input.lang,
        name: input.name,
        origin: input.origin,
        imageUrl: input.imageUrl,
        aliases: [],
      };
      rows.set(c.id, toRow(c, 0));
      saveCreated();
      return c;
    },
    async setImage(id, imageUrl) {
      const r = rows.get(id);
      if (!r) return null;
      r.imageUrl = imageUrl;
      if (id.startsWith("u-")) saveCreated();
      else
        writeJson(IMAGES_FILE, {
          ...readJson<Record<string, string>>(IMAGES_FILE, {}),
          [id]: imageUrl,
        });
      return strip(r);
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
  };
}
