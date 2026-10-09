// What the community pages' routes send (the characters page first).
import type { GameKey } from "@/game/games";
import type { Audience } from "@/game/impostor/questions";
import type { QuestionKind } from "@/game/impostor/types";
import type { Tone } from "@/game/lineup/bank";
import type { Taste } from "@/game/tastes";
import type { ThemeSet } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import type { PersonRef } from "./contract";

/** A character's card on the characters page. */
export interface LibraryCard {
  /** The app's id: "pt-wd-Q302", or "u-<uuid>" for one made on a pick card. */
  id: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  taste: Taste | null;
  /** Pictures everyone sees. */
  pictures: number;
  /** The account that made it; null for the library's own (or a guest's). */
  by: PersonRef | null;
}

export const LIBRARY_SORTS = ["top", "new", "nopic"] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

/** What the library still needs, as the page's shortcuts filter it. */
export const LIBRARY_NEEDS = ["missing", "unreviewed"] as const;
export type LibraryNeed = (typeof LIBRARY_NEEDS)[number];

export interface LibraryCounts {
  all: number;
  /** Without a picture: out of What for?'s deck. */
  nopic: number;
  /** The language most characters still have no name in (besides the reader's own); null when none lacks. */
  missing: { lang: Lang; n: number } | null;
  /** Added by hand and not curated yet. */
  unreviewed: number;
}

/** GET /api/characters/browse: one page of the catalog. */
export interface LibraryPage {
  items: LibraryCard[];
  /** Characters that match, on every page. */
  total: number;
  /** The offset of the next page; null on the last. */
  next: number | null;
  counts: LibraryCounts;
}

/** A player's nickname on a sheet. */
export interface SheetAlias {
  id: number;
  lang: Lang;
  name: string;
  /** Who put it; null once their account is gone. */
  by: PersonRef | null;
  /** The last account that changed it, when someone did. */
  editedBy: PersonRef | null;
  /** Reported enough to be hidden: only its author still sees it. */
  hidden: boolean;
  mine: boolean;
}

/** GET /api/characters/[id]/sheet: everything the sheet shows but the pictures. */
export interface CharacterSheet {
  card: LibraryCard;
  /** Language-free ("wd-Q302"). */
  baseId: string;
  /** When its author made it; null for the library's own. */
  createdAt: number | null;
  /** Added by hand or by a player, not curated yet. */
  unreviewed: boolean;
  /** Times it was picked, in every language. */
  picks: number;
  /** The active themes it starts, named in the reader's language. */
  themes: string[];
  /** The library's names, one per language it has, locked. */
  names: { lang: Lang; name: string; aliases: string[] }[];
  aliases: SheetAlias[];
  /** Languages it has no name in yet: the first nickname there becomes its name. */
  missing: Lang[];
}

/** One change to a character's nicknames, as the history lists it. */
export interface AliasHistoryEntry {
  action: "add" | "edit" | "remove" | "restore";
  before: string | null;
  after: string | null;
  by: PersonRef | null;
  at: number;
}

// Workshop ------------------------------------------------------------------

export const WORKSHOP_KINDS = ["theme", "question", "mission"] as const;
export type WorkshopKind = (typeof WORKSHOP_KINDS)[number];

/** voting: up for votes; review: a curator is looking at it; live: in the game; refused: left out. */
export type WorkshopStatus = "voting" | "review" | "live" | "refused";

/** A scale's end or a pick's option, as typed: an emoji and a few words. */
export interface DraftLabel {
  emoji: string;
  text: string;
}

/** What a theme suggestion keeps, in the language it was written in. */
export interface ThemeDraft {
  name: string;
  set: ThemeSet;
  games: ("who-am-i" | "impostor")[];
  /** Language-free library ids, 3 to 5. */
  starters: string[];
  /** "all": the examples work in every language; else only in this one. */
  startersLang: "all" | Lang;
}

export interface QuestionDraft {
  kind: QuestionKind;
  text: string;
  low: DraftLabel | null;
  high: DraftLabel | null;
  choices: DraftLabel[];
  scope: "general" | "set" | "theme";
  set: ThemeSet | null;
  themeId: string | null;
  audience: Audience;
  spice: 1 | 2 | 3;
}

export interface MissionDraft {
  text: string;
  tone: Tone;
  heavy: boolean;
}

export type WorkshopDraft =
  | { kind: "theme"; theme: ThemeDraft }
  | { kind: "question"; question: QuestionDraft }
  | { kind: "mission"; mission: MissionDraft };

/** The texts a suggestion carries, by piece: name, text, low, high, c0, c1… */
export type Pieces = Record<string, string>;

/** Other languages' texts, by language then piece. */
export type Translations = Partial<Record<Lang, Pieces>>;

/** A theme's starter as a card shows it. */
export interface StarterCard {
  id: string;
  name: string;
  imageUrl: string | null;
  taste: Taste | null;
}

/** One card of the Workshop: a suggestion, or something live in a game's bank. */
export interface WorkshopItem {
  /** A suggestion's id, or "bank:<kind>:<bank id>" for what was always live. */
  id: string;
  kind: WorkshopKind;
  status: WorkshopStatus;
  /** Its texts in the reader's language when there are some, else in the one it was written in. */
  lang: Lang;
  theme: {
    name: string;
    set: ThemeSet | null;
    games: GameKey[];
    starters: StarterCard[];
  } | null;
  question:
    | (Omit<QuestionDraft, "themeId"> & { themeName: string | null })
    | null;
  mission: MissionDraft | null;
  /** Who suggested it; null for the bank's own. */
  by: PersonRef | null;
  /** When it was suggested; null for the bank's own. */
  at: number | null;
  votes: { yes: number; no: number; mine: boolean | null } | null;
  reason: string | null;
  mine: boolean;
}

export interface WorkshopCounts {
  voting: number;
  live: number;
  refused: number;
}

/** GET /api/workshop: one page of cards and the numbers on the filters. */
export interface WorkshopPage {
  items: WorkshopItem[];
  next: number | null;
  /** By kind, with the page's game and "mine" filters. */
  counts: Record<WorkshopKind, WorkshopCounts>;
  /** Suggestions the reader may still send this week; null for a guest. */
  left: number | null;
  curator: boolean;
}

/** POST /api/workshop/translate: the wand's answer, by language then piece, and where each came from. */
export interface WandResult {
  translations: Translations;
  sources: Partial<
    Record<Lang, Record<string, "bank" | "pattern" | "service">>
  >;
}

/** What the composer's live check says: a slot to show it under, and the message's key and values. */
export interface WorkshopCheck {
  slot: "name" | "starters" | "text";
  code:
    | "near_theme"
    | "same_starters"
    | "no_picture"
    | "near_text"
    | "blocked_word";
  /** The theme, question or mission it is near, or the character without a picture. */
  ref: string;
}

// News ----------------------------------------------------------------------

export type NewsKind = "new" | "better" | "fix" | "workshop" | "notice";
export type NewsGame = GameKey | "site";
export type NewsReactionKey = "love" | "party" | "wow";

/** A post of the news page, in the reader's language. */
export interface NewsItem {
  id: string;
  at: number;
  kind: NewsKind;
  game: NewsGame;
  /** A fix may have none. */
  title: string | null;
  /** "{by}" stands for `by`, shown with their face. */
  body: string;
  action: { href: string; label: string } | null;
  /** Who suggested it, for what came from the Workshop. */
  by: PersonRef | null;
  reactions: Partial<Record<NewsReactionKey, number>>;
  /** The reader's own reactions. */
  mine: NewsReactionKey[];
}

/** GET /api/news. */
export interface NewsPage {
  items: NewsItem[];
  /** Guests read; accounts react. */
  signedIn: boolean;
}

// Community ---------------------------------------------------------------

export type RankingPeriod = "week" | "month" | "ever";

export interface RankingRow {
  person: PersonRef;
  place: number;
  xp: number;
  matches: number;
  wins: number;
  level: number;
}

/** GET /api/rankings. */
export interface RankingPage {
  rows: RankingRow[];
  /** The reader's own row, wherever it falls; null for a guest or without XP. */
  me: RankingRow | null;
  /** Who helped the library most in the last 30 days. */
  helpers: {
    person: PersonRef;
    total: number;
    pictures: number;
    aliases: number;
    characters: number;
    live: number;
  }[];
}

export type PlayersFilter = "all" | "with" | "now";

/** A player on the players page, as they let the reader see them. */
export interface PlayerTile {
  person: PersonRef;
  /** Null when they keep their activity from the reader. */
  level: number | null;
  /** Matches played with the reader. */
  together: number;
  /** In a room now: its game, and its code when it is public. */
  playing: { game: GameKey; code: string | null } | null;
}

/** GET /api/players. */
export interface PlayersPage {
  players: PlayerTile[];
  next: number | null;
}

export type FeedFilter =
  | "all"
  | "picture"
  | "alias"
  | "character"
  | "suggestion";

/** One line of the contributions feed. */
export interface ContributionItem {
  id: string;
  kind: "picture" | "character" | "alias" | "suggestion" | "live";
  at: number;
  by: PersonRef;
  character: { id: string; name: string; imageUrl: string | null } | null;
  alias: { name: string; before: string | null; edited: boolean } | null;
  suggestion: {
    id: string;
    kind: WorkshopKind;
    title: string;
    status: WorkshopStatus;
  } | null;
}

/** GET /api/contributions. */
export interface ContributionsPage {
  items: ContributionItem[];
  /** Pass as `?before=` for the next page; null on the last. */
  next: number | null;
  /** The reader's own numbers and how far the pictures badge is; null for a guest. */
  mine: {
    pictures: number;
    aliases: number;
    suggestions: number;
    badge: {
      id: "pictures";
      tier: "bronze" | "silver" | "gold" | null;
      next: number | null;
      value: number;
    };
  } | null;
}
