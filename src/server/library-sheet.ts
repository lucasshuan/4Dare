import "server-only";
import { normalizeName } from "@/game/match";
import type { Taste } from "@/game/tastes";
import { GameError, LANGS, type Lang, type PlayerId } from "@/game/types";
import { getBackend } from "./backend";
import type { AliasAction } from "./backend/community-types";
import { parseEntryId } from "./backend/seed-format";
import { appId, catalog, invalidateCatalog, peopleOf } from "./catalog";
import type {
  AliasHistoryEntry,
  CharacterSheet,
  SheetAlias,
} from "./community-contract";

/** The language-free id behind an app id ("pt-wd-Q302" -> "wd-Q302"). */
export const libraryId = (id: string) => parseEntryId(id)?.id ?? id;

const ID =
  /^(?:(?:en|es|ja|pt)-)?(?:wd-Q\d+|al-\d+|hand-[a-z0-9-]{1,80}|u-[0-9a-f-]{36})$/;

/** A character id as routes take it, or null. */
export const characterIdOf = (raw: unknown): string | null =>
  typeof raw === "string" && ID.test(raw) ? libraryId(raw) : null;

export const ALIAS_MIN = 2;
export const ALIAS_MAX = 40;

/** A nickname as kept: one line, single spaces. */
export const cleanAlias = (raw: unknown) =>
  typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";

/** A character's sheet as `viewer` reads it, in `lang`; null for an unknown id. */
export async function characterSheet(
  rawId: string,
  lang: Lang,
  viewer: PlayerId,
): Promise<CharacterSheet | null> {
  const id = characterIdOf(rawId);
  if (!id) return null;
  const { library, themes } = getBackend();
  let row = (await catalog(lang)).byId.get(id);
  if (!row) {
    // made a moment ago on another instance, or not at all
    if (!(await library.exists(id))) return null;
    row = (await catalog(lang, true)).byId.get(id);
    if (!row) return null;
  }
  const [names, aliases, picks, themeIds, allThemes] = await Promise.all([
    library.names(id),
    library.aliases(id),
    library.picks(id),
    library.themesOf(id),
    themes.catalog(),
  ]);
  const people = await peopleOf(
    [row.createdBy, ...aliases.flatMap((a) => [a.createdBy, a.editedBy])],
    lang,
  );
  const themeNames = allThemes
    .filter((t) => themeIds.includes(t.id))
    .map((t) => t[lang] || t.en);
  const shown = aliases
    .filter((a) => !a.hidden || a.createdBy === viewer)
    .map(
      (a): SheetAlias => ({
        id: a.id,
        lang: a.lang,
        name: a.name,
        by: (a.createdBy && people.get(a.createdBy)) || null,
        // changing one's own nickname is not "edited by"
        editedBy:
          (a.editedBy &&
            a.editedBy !== a.createdBy &&
            people.get(a.editedBy)) ||
          null,
        hidden: a.hidden,
        mine: a.createdBy === viewer,
      }),
    );
  return {
    card: {
      id: appId(lang, id),
      name: row.name,
      origin: row.origin,
      imageUrl: row.imageUrl,
      taste: row.taste,
      pictures: row.pictures,
      by: (row.createdBy && people.get(row.createdBy)) || null,
    },
    baseId: id,
    createdAt: row.createdBy ? row.createdAt : null,
    unreviewed: id.startsWith("hand-") || id.startsWith("u-"),
    picks,
    themes: themeNames,
    names: names.map((n) => ({
      lang: n.lang,
      name: n.name,
      aliases: n.aliases,
    })),
    aliases: shown,
    missing: LANGS.filter((l) => !names.some((n) => n.lang === l)),
  };
}

/** Everything done to a character's nicknames, newest first, names in `lang`. */
export async function aliasHistory(
  rawId: string,
  lang: Lang,
): Promise<AliasHistoryEntry[]> {
  const id = characterIdOf(rawId);
  if (!id) throw new GameError("not_found");
  const events = await getBackend().library.history(id, 60);
  const people = await peopleOf(
    events.map((e) => e.actor),
    lang,
  );
  return events.map((e) => ({
    action: e.action,
    before: e.before,
    after: e.after,
    by: (e.actor && people.get(e.actor)) || null,
    at: e.createdAt,
  }));
}

const accountOnly = async () => {
  const me = await getBackend().auth.identity("en");
  if (me.isGuest) throw new GameError("sign_in_needed");
  return me;
};

/** The library's names and every nickname of the character in `lang`, folded. */
async function takenNames(id: string, lang: Lang) {
  const { library } = getBackend();
  const [names, aliases] = await Promise.all([
    library.names(id),
    library.aliases(id),
  ]);
  return new Set(
    [
      ...names.flatMap((n) => [n.name, ...(n.lang === lang ? n.aliases : [])]),
      ...aliases.filter((a) => a.lang === lang).map((a) => a.name),
    ].map(normalizeName),
  );
}

/** Adds a nickname; the first one in a language the character has no name in becomes its name there. */
export async function addNickname(rawId: unknown, lang: Lang, raw: unknown) {
  const me = await accountOnly();
  const id = characterIdOf(rawId);
  const name = cleanAlias(raw);
  if (!id || name.length < ALIAS_MIN || name.length > ALIAS_MAX)
    throw new GameError("invalid_input");
  const norm = normalizeName(name);
  if (!norm) throw new GameError("invalid_input");
  if ((await takenNames(id, lang)).has(norm)) throw new GameError("conflict");
  const { library } = getBackend();
  const made = await library.addAlias(id, lang, name, norm, me.id);
  if (made === null) throw new GameError("rate_limited");
  if (made === -1) throw new GameError("conflict");
  const names = await library.names(id);
  if (!names.some((n) => n.lang === lang))
    await library.addName(id, lang, name);
  invalidateCatalog();
  return made;
}

/** Changes, takes out or brings back a player's nickname (the library's own never change). */
export async function changeNickname(
  rawAlias: unknown,
  action: Exclude<AliasAction, "add">,
  raw: unknown,
) {
  const me = await accountOnly();
  if (typeof rawAlias !== "number" || !Number.isInteger(rawAlias))
    throw new GameError("invalid_input");
  const { library } = getBackend();
  const alias = await library.alias(rawAlias);
  if (!alias) throw new GameError("not_found");
  const name = action === "edit" ? cleanAlias(raw) : alias.name;
  if (name.length < ALIAS_MIN || name.length > ALIAS_MAX)
    throw new GameError("invalid_input");
  const norm = normalizeName(name);
  if (action === "edit" && norm !== normalizeName(alias.name)) {
    const taken = await takenNames(alias.characterId, alias.lang);
    if (taken.has(norm)) throw new GameError("conflict");
  }
  const result = await library.changeAlias(alias.id, action, name, norm, me.id);
  if (result === "limit") throw new GameError("rate_limited");
  if (result === "taken") throw new GameError("conflict");
  if (result === "missing") throw new GameError("not_found");
  invalidateCatalog();
}

/** One report per account; the third hides the nickname. Whether it is hidden now. */
export async function reportNickname(rawAlias: unknown) {
  const me = await accountOnly();
  if (typeof rawAlias !== "number" || !Number.isInteger(rawAlias))
    throw new GameError("invalid_input");
  const hidden = await getBackend().library.reportAlias(rawAlias, me.id);
  if (hidden) invalidateCatalog();
  return hidden;
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "character";

export const CHARACTER_NAME_MAX = 48;

/**
 * A character made on the characters page, with the account as its author:
 * "hand-<slug of its name>", in every language under the name given until
 * someone names it there. Nicknames and a picture come after. Refused when
 * the library already has the name (in this language) or a nickname of it.
 */
export async function createCharacter(input: {
  lang: Lang;
  name: unknown;
  origin: unknown;
  taste: Taste;
  aliases: unknown;
}): Promise<string> {
  const me = await accountOnly();
  const name = cleanAlias(input.name);
  const origin = cleanAlias(input.origin).slice(0, CHARACTER_NAME_MAX) || null;
  if (name.length < 2 || name.length > CHARACTER_NAME_MAX)
    throw new GameError("invalid_input");
  const norm = normalizeName(name);
  const cat = await catalog(input.lang);
  if (cat.rows.some((r) => normalizeName(r.name) === norm))
    throw new GameError("conflict");
  const { library } = getBackend();
  const base = `hand-${slug(name)}`;
  let id = base;
  for (let n = 2; await library.exists(id); n++) id = `${base}-${n}`;
  await library.create({
    id,
    lang: input.lang,
    name,
    origin,
    taste: input.taste,
    createdBy: me.id,
  });
  const nicknames = Array.isArray(input.aliases)
    ? input.aliases.map(cleanAlias).filter((a) => a.length >= ALIAS_MIN)
    : [];
  const seen = new Set([norm]);
  for (const alias of nicknames.slice(0, 8)) {
    const key = normalizeName(alias);
    if (!key || seen.has(key) || alias.length > ALIAS_MAX) continue;
    seen.add(key);
    await library.addAlias(id, input.lang, alias, key, me.id);
  }
  invalidateCatalog();
  return appId(input.lang, id);
}
