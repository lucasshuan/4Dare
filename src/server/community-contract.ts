// What the community pages' routes send (the characters page first).
import type { Taste } from "@/game/tastes";
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
