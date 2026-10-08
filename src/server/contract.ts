// Shapes shared by server actions, route handlers and the UI.
import type { GameKey } from "@/game/games";
import type { Gosto } from "@/game/gostos";
import type { LineupRules } from "@/game/lineup/rules";
import type { SyncedSettings } from "@/game/options";
import type { BadgeGroup, BadgeId } from "@/game/profile/badges";
import type {
  Fact,
  impostorNumbers,
  whoAmINumbers,
} from "@/game/profile/history";
import type {
  About,
  Banner,
  Privacy,
  ShowcaseItem,
} from "@/game/profile/profile";
import type { ThemeSet } from "@/game/theme-sets";
import type {
  Avatar,
  Character,
  ErrorCode,
  Identity,
  Localized,
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
  /** What follows an account between devices (theme, chat bubbles, game options); null for a guest, or before an account saved any. */
  settings: SyncedSettings | null;
}

/** The account box: how the person signs in, and with what. */
export interface AccountInfo {
  email: string | null;
  /** The providers linked to the account. */
  providers: ("discord" | "google")[];
  /** Another provider can be linked (online, with manual linking on). */
  canLink: boolean;
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

/** A theme as the room setup lists it (GET /api/themes/catalog). */
export interface ThemeCatalogEntry {
  id: string;
  set: ThemeSet | null;
  games: GameKey[];
  /** Its shared starters' gostos, clearest first; null for a starter with none yet. */
  gostos: (Gosto[] | null)[];
  names: Localized;
}

export interface CreateRoomInput extends LineupRules {
  game: GameKey;
  name: string;
  visibility: "public" | "private";
  /** Required when private; ignored when public. */
  password: string;
  /** Within the game's range (GAME_SEATS). */
  seats: number;
  voteSeconds: number;
  askSeconds: number;
  guessSeconds: number;
  answerSeconds: number;
  validateSeconds: number;
  replySeconds: number;
  talkSeconds: number;
  lastSeconds: number;
  lotSeconds: number;
  tradeSeconds: number;
  defendSeconds: number;
  judgeSeconds: number;
  /** Impostor: null lets the seats decide. */
  impostors: number | null;
  themeMode: "vote" | "host";
  offGostos: Gosto[];
  offThemes: string[];
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
  banner: Banner | null;
  quote: string | null;
  createdAt: number;
  /** Null when the owner keeps their activity from this reader. */
  numbers: {
    xp: number;
    matches: number;
    wins: number;
    timeMs: number;
  } | null;
}

/** A character on a profile's showcase, in the reader's language (null when it has no name there). */
export interface ShowcaseView extends ShowcaseItem {
  character: CharacterDTO | null;
}

/** One game's card on a profile, with that game's own numbers. */
interface GameTotals {
  matches: number;
  wins: number;
  timeMs: number;
  /** Matches in the last 30 days. */
  recent: number;
}

/** A game's card on a profile: every game's numbers plus its own. */
export type GameView = GameTotals &
  (
    | ({ game: "who-am-i" } & ReturnType<typeof whoAmINumbers>)
    | ({ game: "impostor" } & ReturnType<typeof impostorNumbers>)
  );

/** A curiosity with its people named. */
export type FactView =
  | (Omit<Extract<Fact, { kind: "partner" }>, "id"> & { person: PersonRef })
  | (Omit<Extract<Fact, { kind: "hardest" }>, "to"> & {
      to: PersonRef | null;
    })
  | Extract<Fact, { kind: "fastest" | "theme" | "escape" | "bullseye" }>;

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

/** A badge on a profile: how far its owner got, and since when they hold the tier. */
export interface BadgeView {
  id: BadgeId;
  group: BadgeGroup;
  goals: readonly [number, number, number];
  value: number;
  /** 0: not yet; 1–3: bronze, silver, gold. */
  tier: number;
  earnedAt: number | null;
}

/** An account's profile page. */
export interface ProfileView extends PersonRef {
  accent: string | null;
  banner: Banner | null;
  quote: string | null;
  createdAt: number;
  about: About;
  showcase: ShowcaseView[];
  /** The reader is this account. */
  isMe: boolean;
  /** The parts the owner keeps from this reader: they come empty. */
  hidden: {
    profile: boolean;
    mural: boolean;
    activity: boolean;
    showcase: boolean;
    contributions: boolean;
  };
  /** The owner's own settings, for the editor; null for anyone else. */
  own: { privacy: Privacy; handleChangedAt: number | null } | null;
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
  badges: BadgeView[];
}

/** A line on a profile's mural, as a reader sees it. */
export interface MuralLine {
  id: number;
  author: PersonRef;
  body: string;
  at: number;
  /** Hidden by reports: only its author still sees it, marked. */
  hidden: boolean;
  mine: boolean;
  canDelete: boolean;
  /** One level only: replies have none. */
  replies: MuralLine[];
}

export interface MuralView {
  lines: MuralLine[];
  /** Older top lines wait: ask with ?before= the last one's time. */
  more: boolean;
  canWrite: boolean;
  canReply: boolean;
}
