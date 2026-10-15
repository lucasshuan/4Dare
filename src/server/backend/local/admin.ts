import "server-only";
import {
  type AdminStore,
  type AuditEntry,
  type ConfigVersion,
  emptyStats,
  readValues,
  type StoredLabScene,
} from "../admin-types";
import { processSingleton, readJson, writeJson } from "./disk";
import { localImpostor } from "./impostor";
import { localLineup } from "./lineup";
import { localThemes } from "./themes";

const FILE = "game-config.json";
const SCENES = "lab-scenes.json";

/** Local mode: an empty overview, the audit in memory and the config versions in .data/. */
export function localAdmin(): AdminStore {
  const log: (AuditEntry & { at: number })[] = [];
  // the fixtures hold only rows that are on: what the panel turns off is kept here
  const off = new Set<string>();
  const versions = processSingleton<ConfigVersion[]>("game-config", () =>
    readJson<ConfigVersion[]>(FILE, []),
  );
  const scenes = processSingleton<StoredLabScene[]>("lab-scenes", () =>
    readJson<StoredLabScene[]>(SCENES, []),
  );
  return {
    async stats(days) {
      return emptyStats(days);
    },
    async audit(e) {
      log.push({ ...e, at: Date.now() });
    },
    async config() {
      return (
        versions.at(-1) ?? {
          v: 0,
          values: readValues({}),
          note: null,
          author: null,
          at: 0,
        }
      );
    },
    async versions(limit) {
      return versions.slice(-limit).reverse();
    },
    async banks() {
      const [themes, questions, missions, extras] = await Promise.all([
        localThemes().list(),
        localImpostor().list(),
        localLineup().missions(),
        localLineup().extras(),
      ]);
      const live = (kind: string, id: string) => !off.has(`${kind}:${id}`);
      return {
        themes: themes.map((t) => ({
          id: t.id,
          pt: t.pt,
          set: t.set,
          games: t.games,
          live: live("theme", t.id),
        })),
        questions: questions.map((q) => ({
          id: q.id,
          pt: q.text.pt,
          kind: q.kind,
          spice: q.spice,
          scope: q.scope,
          live: live("question", q.id),
        })),
        missions: missions.map((m) => ({
          id: m.id,
          pt: m.text.pt,
          tone: m.tone,
          heavy: m.heavy,
          live: live("mission", m.id),
        })),
        extras: extras.map((x) => ({
          id: x.id,
          pt: x.name.pt,
          emoji: x.emoji,
          tint: x.tint,
          live: live("extra", x.id),
        })),
      };
    },
    async setLive(kind, id, isLive) {
      const key = `${kind}:${id}`;
      const was = !off.has(key);
      if (isLive) off.delete(key);
      else off.add(key);
      return was;
    },
    async labScenes(limit) {
      return scenes.slice(-limit).reverse();
    },
    async labScene(id) {
      return scenes.find((x) => x.id === id) ?? null;
    },
    async saveLabScene(scene) {
      const id = crypto.randomUUID();
      scenes.push({ ...scene, id, at: Date.now() });
      writeJson(SCENES, scenes);
      return id;
    },
    async deleteLabScene(id) {
      const i = scenes.findIndex((x) => x.id === id);
      if (i >= 0) scenes.splice(i, 1);
      writeJson(SCENES, scenes);
    },
    async characterImages() {
      return [];
    },
    async setImageStatus() {},
    async characterInfo() {
      return null;
    },
    async hiddenCharacters() {
      return [];
    },
    async origins() {
      return [];
    },
    async editCharacter() {},
    async setNicknameHidden() {},
    async closeIdle() {
      return 0;
    },
    async tableCounts() {
      return {};
    },
    async saveConfig(values, note, author) {
      const v = (versions.at(-1)?.v ?? 0) + 1;
      versions.push({ v, values, note, author, at: Date.now() });
      writeJson(FILE, versions);
      return v;
    },
  };
}
