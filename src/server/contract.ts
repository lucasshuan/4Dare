// Shapes shared by server actions, route handlers and the UI.
import type { GameKey } from "@/game/games";
import type { ThemeSet } from "@/game/theme-sets";
import type {
  Avatar,
  Character,
  ErrorCode,
  Identity,
  Lang,
  Phase,
  PlayerId,
} from "@/game/types";

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ErrorCode };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: ErrorCode): Result<never> => ({ ok: false, error });

/** The signed-in person (guest or account), as the UI needs it. */
export interface Me {
  id: PlayerId;
  isGuest: boolean;
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
  host: Pick<Identity, "isGuest" | "name" | "guestNumber">;
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

export type { Lang };
