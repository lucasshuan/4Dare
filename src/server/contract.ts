// Shapes shared by server actions, route handlers and the UI.
import type { GameKey } from "@/game/games";
import type { Fact } from "@/game/profile/history";
import type { ThemeSet } from "@/game/theme-sets";
import type {
  Avatar,
  Character,
  ErrorCode,
  Identity,
  Phase,
  PlayerId,
} from "@/game/types";

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: ErrorCode): Result<never> => ({ ok: false, error });

/** The signed-in person (guest or account), as the server keeps them. */
export interface Account {
  id: PlayerId;
  isGuest: boolean;
  /** The @handle of the profile's link (/u/<handle>); null for a guest. */
  handle: string | null;
  name: string | null;
  guestNumber: number;
  avatar: Avatar;
  /** OAuth provider of the account, if any. */
  provider: "discord" | "google" | null;
  /** Picture that came from the provider, offered as an avatar choice. */
  providerAvatarUrl: string | null;
  /** "local" = no Supabase configured: guests only, plus a fake test account. */
  authMode: "local" | "supabase";
}

/**
 * The signed-in person as the UI gets them: `guestName` is their guest name
 * in the page's language (a guest's name, and an account's while it has none).
 */
export type Me = Omit<Account, "guestNumber"> & { guestName: string };

/** The match a player is in and has not left, while it is going (from the theme to the last guess). */
export interface CurrentMatch {
  code: string;
  game: GameKey;
  phase: Phase;
}

/** The room a player sits in now, told by a room they lost their seat in (one room at a time). */
export interface ElsewhereRoom {
  code: string;
  /** Empty when the host left it unnamed. */
  name: string;
  /** The host's name in the reader's language. */
  host: Pick<Identity, "isGuest"> & { name: string };
}

/** A character as the autocomplete shows it. */
export type CharacterDTO = Pick<
  Character,
  "id" | "lang" | "name" | "origin" | "imageUrl"
>;

export interface CharacterSearchResponse {
  results: CharacterDTO[];
}

export interface CreateRoomInput {
  game: GameKey;
  name: string;
  visibility: "public" | "private";
  /** Required when private; ignored when public. */
  password: string;
  seats: 2 | 3 | 4;
  voteSeconds: number;
  askSeconds: number;
  guessSeconds: number;
  answerSeconds: number;
  validateSeconds: number;
  themeMode: "vote" | "host";
  themeSets: ThemeSet[];
}

/** The eight avatar colours an account can choose (design system `avatar-*`). */
export const AVATAR_COLORS = [
  "#DCE8FA",
  "#F4C7D9",
  "#BFE6C8",
  "#D9C7F4",
  "#BFE3EA",
  "#F3D3B8",
  "#F2E3A8",
  "#D7DDE8",
] as const;

/** An account as a profile names it: in a curiosity, on the mural. */
export interface PersonRef {
  id: PlayerId;
  handle: string;
  name: string;
  avatar: Avatar;
}

/** What the quick card shows of an account, opened from its avatar. */
export interface PlayerCard extends PersonRef {
  accent: string | null;
  quote: string | null;
  createdAt: number;
  xp: number;
  matches: number;
  wins: number;
  timeMs: number;
}

/** One game's card on a profile, with that game's own numbers. */
export interface GameView {
  game: GameKey;
  matches: number;
  wins: number;
  timeMs: number;
  /** Matches in the last 30 days. */
  recent: number;
  /** "Who am I?": cards discovered, the share discovered and the questions it took. */
  discovered: number;
  discoverRate: number | null;
  avgQuestions: number | null;
  bestQuestions: number | null;
}

/** A curiosity with its people named. */
export type FactView =
  | (Omit<Extract<Fact, { kind: "partner" }>, "id"> & { person: PersonRef })
  | (Omit<Extract<Fact, { kind: "hardest" }>, "to"> & {
      to: PersonRef | null;
    })
  | Extract<Fact, { kind: "fastest" | "theme" }>;

/** A picture someone sent for a character, as their profile lists it. */
export interface ContributedPicture {
  id: string;
  url: string;
  /** Pending: only its author sees it, while the detector could not tell. */
  status: "active" | "pending";
  /** It is the character's cover now. */
  cover: boolean;
  /** The character in the reader's language; null when it has no name there. */
  character: { id: string; name: string; origin: string | null } | null;
}

/** An account's profile page. */
export interface ProfileView extends PersonRef {
  accent: string | null;
  quote: string | null;
  createdAt: number;
  /** The reader is this account. */
  isMe: boolean;
  xp: number;
  matches: number;
  wins: number;
  timeMs: number;
  /** The game of the match they are in now. */
  playing: GameKey | null;
  /** The last year's matches, for the garden: when, which game, won. */
  plays: { at: number; game: GameKey; won: boolean }[];
  games: GameView[];
  facts: FactView[];
  pictures: ContributedPicture[];
  characters: CharacterDTO[];
}
