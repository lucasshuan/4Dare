import "server-only";
import { tastesByRule } from "@/game/tastes";
import { LANGS, type Lang } from "@/game/types";
import type {
  AliasEvent,
  CatalogRow,
  LibraryStore,
  NewLibraryCharacter,
  StoredAlias,
} from "../community-types";
import { originLabel } from "../seed-format";
import type { LocalCharacterStore } from "./characters";
import { processSingleton, readJson, writeJson } from "./disk";
import { LOCAL_CHARACTERS, LOCAL_ORIGINS } from "./fixtures";

interface Saved {
  created: (NewLibraryCharacter & { createdAt: number })[];
  names: { id: string; lang: Lang; name: string }[];
  aliases: StoredAlias[];
  events: AliasEvent[];
  reports: { aliasId: number; reporter: string }[];
}

const FILE = "library.json";
const HOURLY = 30;
const HIDE_AT = 3;

/** The library side of the characters page in local mode: the fixtures plus what players added, in .data/. */
export function localLibraryStore(
  characters: LocalCharacterStore,
): LibraryStore {
  const data = processSingleton<Saved>("library", () =>
    readJson<Saved>(FILE, {
      created: [],
      names: [],
      aliases: [],
      events: [],
      reports: [],
    }),
  );
  const save = () => writeJson(FILE, data);
  const origins = new Map(LOCAL_ORIGINS.map((o) => [o.id, o]));
  const live = (id: string, lang: Lang) =>
    data.aliases
      .filter(
        (a) =>
          a.characterId === id && a.lang === lang && !a.hidden && !a.removed,
      )
      .map((a) => a.name);
  const extraName = (id: string, lang: Lang) =>
    data.names.find((n) => n.id === id && n.lang === lang)?.name;
  const recent = (actor: string) =>
    data.events.filter(
      (e) => e.actor === actor && e.createdAt > Date.now() - 3600_000,
    ).length;
  const event = (
    a: StoredAlias,
    action: AliasEvent["action"],
    before: string | null,
    after: string | null,
    actor: string,
  ) =>
    data.events.push({
      id: data.events.length + 1,
      aliasId: a.id,
      action,
      before,
      after,
      actor,
      createdAt: Date.now(),
    });

  const rowsFor = (lang: Lang): CatalogRow[] => {
    const seeds = LOCAL_CHARACTERS.map((c): CatalogRow => {
      const name =
        c.names[lang] ?? c.names.en ?? Object.values(c.names)[0] ?? "";
      return {
        id: c.id,
        name,
        origin: originLabel(c.origin ? origins.get(c.origin) : undefined, lang),
        imageUrl: characters.cover(c.id),
        popularity: c.popularity[lang] ?? null,
        createdAt: 0,
        createdBy: null,
        taste: tastesByRule(c.origin, c.category)?.[0] ?? null,
        pictures: characters.cover(c.id) ? 1 : 0,
        aliases: [...(c.aliases[lang] ?? []), ...live(c.id, lang)],
        otherNames: LANGS.filter((l) => l !== lang).flatMap((l) =>
          c.names[l] ? [c.names[l]] : [],
        ),
        langs: LANGS.filter((l) => c.names[l]),
      };
    });
    const made = data.created.map(
      (c): CatalogRow => ({
        id: c.id,
        name: extraName(c.id, lang) ?? c.name,
        origin: c.origin,
        imageUrl: characters.cover(c.id),
        popularity: c.lang === lang ? 0 : null,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
        taste: c.taste,
        pictures: characters.cover(c.id) ? 1 : 0,
        aliases: live(c.id, lang),
        otherNames: [],
        langs: [...LANGS],
      }),
    );
    return [...seeds, ...made].sort((a, b) => (a.id < b.id ? -1 : 1));
  };

  return {
    async catalogPage(lang, after, limit) {
      return rowsFor(lang)
        .filter((r) => !after || r.id > after)
        .slice(0, limit);
    },
    async names(id) {
      const seed = LOCAL_CHARACTERS.find((c) => c.id === id);
      if (seed)
        return LANGS.flatMap((lang) =>
          seed.names[lang]
            ? [
                {
                  lang,
                  name: seed.names[lang],
                  aliases: seed.aliases[lang] ?? [],
                },
              ]
            : [],
        );
      const made = data.created.find((c) => c.id === id);
      return made
        ? LANGS.map((lang) => ({
            lang,
            name: extraName(id, lang) ?? made.name,
            aliases: [],
          }))
        : [];
    },
    async aliases(id) {
      return data.aliases.filter((a) => a.characterId === id && !a.removed);
    },
    async alias(id) {
      return data.aliases.find((a) => a.id === id) ?? null;
    },
    async history(id, limit) {
      const mine = new Set(
        data.aliases.filter((a) => a.characterId === id).map((a) => a.id),
      );
      return data.events
        .filter((e) => mine.has(e.aliasId))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
    },
    async picks() {
      return 0;
    },
    async themesOf() {
      return [];
    },
    async addAlias(characterId, lang, name, norm, actor) {
      if (recent(actor) >= HOURLY) return null;
      if (
        data.aliases.some(
          (a) =>
            a.characterId === characterId &&
            a.lang === lang &&
            !a.removed &&
            a.name.toLowerCase() === name.toLowerCase(),
        )
      )
        return -1;
      void norm;
      const a: StoredAlias = {
        id: data.aliases.length + 1,
        characterId,
        lang,
        name,
        createdBy: actor,
        editedBy: null,
        hidden: false,
        removed: false,
        createdAt: Date.now(),
      };
      data.aliases.push(a);
      event(a, "add", null, name, actor);
      save();
      return a.id;
    },
    async changeAlias(id, action, name, _norm, actor) {
      if (recent(actor) >= HOURLY) return "limit";
      const a = data.aliases.find((x) => x.id === id);
      if (!a) return "missing";
      if (action === "edit") {
        if (a.removed) return "missing";
        event(a, "edit", a.name, name, actor);
        a.name = name;
        a.editedBy = actor;
      } else if (action === "remove") {
        if (!a.removed) event(a, "remove", a.name, null, actor);
        a.removed = true;
      } else {
        if (a.removed) event(a, "restore", null, a.name, actor);
        a.removed = false;
      }
      save();
      return "ok";
    },
    async reportAlias(id, reporter) {
      const a = data.aliases.find((x) => x.id === id);
      if (!a) return false;
      if (
        !data.reports.some((r) => r.aliasId === id && r.reporter === reporter)
      )
        data.reports.push({ aliasId: id, reporter });
      if (data.reports.filter((r) => r.aliasId === id).length >= HIDE_AT)
        a.hidden = true;
      save();
      return a.hidden;
    },
    async create(input) {
      data.created.push({ ...input, createdAt: Date.now() });
      save();
    },
    async addName(id, lang, name) {
      if (!extraName(id, lang)) data.names.push({ id, lang, name });
      save();
    },
    async exists(id) {
      return (
        LOCAL_CHARACTERS.some((c) => c.id === id) ||
        data.created.some((c) => c.id === id)
      );
    },
    async total() {
      return LOCAL_CHARACTERS.length + data.created.length;
    },
  };
}
