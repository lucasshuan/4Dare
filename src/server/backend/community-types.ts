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

/** A Workshop suggestion as kept (table workshop_suggestions). */
export interface StoredSuggestion {
  id: string;
  kind: "theme" | "question" | "mission";
  status: "voting" | "review" | "live" | "refused";
  lang: Lang;
  /** ThemeDraft, QuestionDraft or MissionDraft (community-contract.ts). */
  payload: unknown;
  /** Other languages' texts, by language then piece. */
  translations: Partial<Record<Lang, Record<string, string>>>;
  createdBy: PlayerId | null;
  yes: number;
  no: number;
  reason: string | null;
  bankId: string | null;
  decidedBy: PlayerId | null;
  decidedAt: number | null;
  createdAt: number;
}

/** A row the curator puts into a bank when a suggestion goes live. */
export type BankInsert =
  | {
      kind: "theme";
      id: string;
      names: Record<Lang, string>;
      set: string;
      games: string[];
      starters: { characterId: string; lang: Lang | "all"; position: number }[];
    }
  | {
      kind: "question";
      id: string;
      questionKind: string;
      scope: "general" | "set" | "theme";
      set: string | null;
      themeId: string | null;
      audience: string;
      spice: number;
      texts: Record<Lang, string>;
      options: unknown;
      createdBy: PlayerId | null;
    }
  | {
      kind: "mission";
      id: string;
      tone: string;
      heavy: boolean;
      texts: Record<Lang, string>;
      createdBy: PlayerId | null;
    };

export interface WorkshopStore {
  /** Every suggestion, newest first (a few hundred at most). */
  suggestions(): Promise<StoredSuggestion[]>;
  suggestion(id: string): Promise<StoredSuggestion | null>;
  /** The new one's id; null past the weekly limit. */
  create(
    kind: StoredSuggestion["kind"],
    lang: Lang,
    payload: unknown,
    translations: StoredSuggestion["translations"],
    author: PlayerId,
  ): Promise<string | null>;
  /** Casts, changes or (null) takes back a vote; the counts after it. Fails once it is no longer up for votes. */
  vote(
    id: string,
    user: PlayerId,
    vote: boolean | null,
  ): Promise<{ yes: number; no: number }>;
  /** A voter's votes, by suggestion. */
  votesOf(user: PlayerId): Promise<Map<string, boolean>>;
  /** How many suggestions an account sent since Monday (UTC). */
  sentThisWeek(author: PlayerId): Promise<number>;
  decide(
    id: string,
    patch: {
      status: StoredSuggestion["status"];
      reason: string | null;
      bankId: string | null;
      translations: StoredSuggestion["translations"];
      by: PlayerId;
    },
  ): Promise<void>;
  /** Inserts a suggestion into its bank (insert only, never an update). */
  insertBank(row: BankInsert): Promise<void>;
  /** Whether a bank id is taken. */
  bankIdTaken(kind: BankInsert["kind"], id: string): Promise<boolean>;
  /** Whether an account reviews suggestions. */
  isCurator(user: PlayerId): Promise<boolean>;
}

export const NEWS_REACTIONS = ["love", "party", "laugh", "wow"] as const;
export type NewsReaction = (typeof NEWS_REACTIONS)[number];

/** A post of the news page (table news_posts). */
export interface StoredNews {
  id: string;
  publishedAt: number;
  kind: "new" | "better" | "fix" | "workshop" | "notice";
  game: "who-am-i" | "impostor" | "lineup" | "site";
  featured: boolean;
  /** By language; a fix may have none. */
  title: Partial<Record<Lang, string>>;
  /** By language; "{by}" stands for the suggestion's author. */
  body: Partial<Record<Lang, string>>;
  /** Where it leads: a path, and its button's words by language. */
  action: { href: string; label: Partial<Record<Lang, string>> } | null;
  suggestionId: string | null;
}

export interface NewsStore {
  /** Every post that shows, newest first. */
  list(): Promise<StoredNews[]>;
  insert(post: StoredNews): Promise<void>;
  /** Puts or takes back one reaction; every reaction's count on the post after it. */
  toggle(
    postId: string,
    user: PlayerId,
    reaction: NewsReaction,
  ): Promise<Partial<Record<NewsReaction, number>>>;
  /** Every post's reaction counts. */
  counts(): Promise<Map<string, Partial<Record<NewsReaction, number>>>>;
  /** A reader's reactions, by post. */
  mine(user: PlayerId): Promise<Map<string, NewsReaction[]>>;
}
