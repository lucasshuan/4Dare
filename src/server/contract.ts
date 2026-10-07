// Shapes shared by server actions, route handlers and the UI.
import type { GameKey } from "@/game/games";
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
