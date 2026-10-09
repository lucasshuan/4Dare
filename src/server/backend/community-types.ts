// Stores behind the community pages: the characters page's library side
// (catalog, nicknames, new characters). Kept apart from types.ts, which
// holds the games' stores.
import type { Taste } from "@/game/tastes";
import type { Lang, PlayerId } from "@/game/types";

/** A character as the characters page lists it, in one language. */
export interface CatalogRow {
  /** Language-free ("wd-Q302", "hand-mojo-jojo", "u-<uuid>"). */
  id: string;
  /** In the language asked, else English, else any it has. */
  name: string;
  origin: string | null;
  imageUrl: string | null;
  /** The language's; null when it doesn't rank the character. */
  popularity: number | null;
  createdAt: number;
  /** The player who made it; null for the library's own. */
  createdBy: PlayerId | null;
  /** Its first taste; null when it has none yet. */
  taste: Taste | null;
  /** Pictures everyone sees. */
  pictures: number;
  /** The language's aliases, the library's then players' nicknames. */
  aliases: string[];
  /** Its names in the other languages. */
  otherNames: string[];
  /** The languages it has a name in. */
  langs: Lang[];
}

/** A player's nickname for a character (table character_aliases). */
export interface StoredAlias {
  id: number;
  /** Language-free. */
  characterId: string;
  lang: Lang;
  name: string;
  createdBy: PlayerId | null;
  editedBy: PlayerId | null;
  hidden: boolean;
  removed: boolean;
  createdAt: number;
}

export type AliasAction = "add" | "edit" | "remove" | "restore";

/** One change to a nickname, for its history. */
export interface AliasEvent {
  id: number;
  aliasId: number;
  action: AliasAction;
  before: string | null;
  after: string | null;
  actor: PlayerId | null;
  createdAt: number;
}

/** The library's own name for a character in one language, with its aliases. */
export interface LibraryName {
  lang: Lang;
  name: string;
  aliases: string[];
}

/** A character a player adds from the characters page. */
export interface NewLibraryCharacter {
  /** "hand-<slug>", free. */
  id: string;
  lang: Lang;
  name: string;
  origin: string | null;
  taste: Taste;
  createdBy: PlayerId;
}

export interface LibraryStore {
  /** Up to `limit` of a language's catalog, ordered by id, after `after`. */
  catalogPage(
    lang: Lang,
    after: string | null,
    limit: number,
  ): Promise<CatalogRow[]>;
  /** A character's library names, one per language it has. */
  names(id: string): Promise<LibraryName[]>;
  /** Its players' nicknames that are not taken out (hidden ones too). */
  aliases(id: string): Promise<StoredAlias[]>;
  alias(id: number): Promise<StoredAlias | null>;
  /** Who did what to its nicknames, newest first. */
  history(id: string, limit: number): Promise<AliasEvent[]>;
  /** How many times it was picked, in every language. */
  picks(id: string): Promise<number>;
  /** The active themes it starts, as their ids. */
  themesOf(id: string): Promise<string[]>;
  /** The new nickname's id; null past the hourly limit; -1 when it is there already. */
  addAlias(
    characterId: string,
    lang: Lang,
    name: string,
    norm: string,
    actor: PlayerId,
  ): Promise<number | null>;
  changeAlias(
    id: number,
    action: Exclude<AliasAction, "add">,
    name: string,
    norm: string,
    actor: PlayerId,
  ): Promise<"ok" | "limit" | "taken" | "missing">;
  /** One report per account; whether it is hidden after it. */
  reportAlias(id: number, reporter: PlayerId): Promise<boolean>;
  /** Inserts the character and its name in every language (insert only). */
  create(input: NewLibraryCharacter): Promise<void>;
  /** Gives a character a name in a language it has none in (insert only). */
  addName(id: string, lang: Lang, name: string): Promise<void>;
  /** Whether a language-free id is taken. */
  exists(id: string): Promise<boolean>;
  /** How many characters the library has. */
  total(): Promise<number>;
}
