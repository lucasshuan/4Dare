import "server-only";
import { randomUUID } from "node:crypto";
import type { CharacterImage, ImageStore, NewImage } from "../types";
import type { LocalCharacterStore } from "./characters";
import { processSingleton, readJson, writeJson } from "./disk";

// The local copy of table character_images (0017, 0022), with its rules: one
// pick per player, chosen or kept, a head start for the library's own
// picture, the cover always the best active one.

const FILE = "character-pictures.json";
/** The library picture's head start, as in the migration. */
const LIBRARY_BONUS = 20;

interface Row extends Omit<CharacterImage, "score"> {
  /** Players who chose it. */
  picks: string[];
  /** Players who kept it as the card showed it (missing in older files). */
  keeps?: string[];
  reporters: string[];
  bonus: number;
  createdAt: number;
  moderation: unknown;
}

/** As character_images.score: head start, choosers, the square root of keepers, two off per report. */
const score = (r: Row) =>
  r.bonus +
  r.picks.length +
  Math.sqrt(r.keeps?.length ?? 0) -
  2 * r.reporters.length;

const toImage = (r: Row): CharacterImage => {
  const {
    picks: _p,
    keeps: _k,
    reporters: _r,
    bonus: _b,
    createdAt: _c,
    moderation: _m,
    ...image
  } = r;
  return { ...image, score: score(r) };
};

const best = (a: Row, b: Row) =>
  score(b) - score(a) || a.createdAt - b.createdAt;

export function localImages(characters: LocalCharacterStore): ImageStore {
  const rows = processSingleton(
    "images",
    () => new Map(readJson<Row[]>(FILE, []).map((r) => [r.id, r])),
  );
  const save = () => writeJson(FILE, [...rows.values()]);
  const of = (characterId: string) =>
    [...rows.values()].filter((r) => r.characterId === characterId);

  /**
   * A character seen for the first time: its cover becomes its first picture
   * (the one a pick card sent for it, when it is that one).
   */
  const seed = (characterId: string) => {
    if (of(characterId).length) return;
    const url = characters.cover(characterId);
    if (!url) return;
    const waiting = [...rows.values()].find(
      (r) => r.characterId === null && r.url === url,
    );
    if (waiting) {
      waiting.characterId = characterId;
      return;
    }
    const id = randomUUID();
    rows.set(id, {
      id,
      characterId,
      url,
      createdBy: null,
      author: null,
      status: "active",
      picks: [],
      keeps: [],
      reporters: [],
      bonus: characterId.startsWith("u-") ? 0 : LIBRARY_BONUS,
      createdAt: 0,
      moderation: null,
    });
  };

  const refresh = (characterId: string) => {
    const top = of(characterId)
      .filter((r) => r.status === "active")
      .sort(best)[0];
    const url = top?.url ?? null;
    if (characters.cover(characterId) !== url)
      characters.setCover(characterId, url);
  };

  const make = (input: NewImage | Row): Row => ({
    id: randomUUID(),
    characterId: input.characterId,
    url: input.url,
    createdBy: input.createdBy,
    author: input.author,
    status: input.status,
    picks: [],
    keeps: [],
    reporters: [],
    bonus: 0,
    createdAt: Date.now(),
    moderation: input.moderation,
  });

  return {
    async add(input) {
      if (input.characterId) seed(input.characterId);
      const row = make(input);
      rows.set(row.id, row);
      save();
      return toImage(row);
    },
    async get(id) {
      const r = rows.get(id);
      return r ? toImage(r) : null;
    },
    async find(characterId, url) {
      if (characterId) seed(characterId);
      const r = [...rows.values()].find(
        (x) => x.characterId === characterId && x.url === url,
      );
      return r ? toImage(r) : null;
    },
    async list(characterId, viewer, limit) {
      seed(characterId);
      return of(characterId)
        .filter(
          (r) =>
            r.status === "active" ||
            (r.status === "pending" && r.createdBy === viewer),
        )
        .sort(best)
        .slice(0, limit)
        .map(toImage);
    },
    async attach(image, characterId) {
      if (image.characterId === characterId) return;
      seed(characterId);
      if (of(characterId).some((r) => r.url === image.url)) return;
      const r = rows.get(image.id);
      if (r && r.characterId === null) r.characterId = characterId;
      else {
        const copy = make({ ...(r ?? image), characterId } as Row);
        rows.set(copy.id, copy);
      }
      save();
      refresh(characterId);
    },
    async recordPick(characterId, url, playerId, chosen) {
      seed(characterId);
      const r = of(characterId).find((x) => x.url === url);
      if (!r || r.picks.includes(playerId)) return;
      const keeps = r.keeps ?? [];
      const kept = keeps.includes(playerId);
      if (kept && !chosen) return;
      // choosing a picture once kept moves the player over
      r.keeps = keeps.filter((id) => id !== playerId);
      if (chosen) r.picks.push(playerId);
      else r.keeps.push(playerId);
      save();
      refresh(characterId);
    },
    async report(id, reporterId, hideAt) {
      const r = rows.get(id);
      if (!r) return null;
      if (!r.reporters.includes(reporterId)) r.reporters.push(reporterId);
      if (
        r.status !== "hidden" &&
        r.createdBy !== null &&
        r.reporters.length >= hideAt
      )
        r.status = "hidden";
      save();
      // every report lowers the score: the cover may move
      if (r.characterId) refresh(r.characterId);
      return r.status;
    },
    async pending(limit) {
      return [...rows.values()]
        .filter((r) => r.status === "pending")
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, limit)
        .map(toImage);
    },
    async approve(id, moderation) {
      const r = rows.get(id);
      if (r?.status !== "pending") return;
      r.status = "active";
      r.moderation = moderation;
      save();
      if (r.characterId) refresh(r.characterId);
    },
    async remove(id) {
      rows.delete(id);
      save();
    },
    async orphans(before, limit) {
      return [...rows.values()]
        .filter((r) => r.characterId === null && r.createdAt < before)
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, limit)
        .map(toImage);
    },
  };
}
