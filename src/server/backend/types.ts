// The backend in five small interfaces. Two implementations exist:
//   local    → everything in memory / on disk, zero setup (dev, tests)
//   supabase → Postgres, Storage, Realtime, Auth
// Server actions and route handlers only talk to these interfaces (via getBackend()).

import type { ChatMessage, NewChatMessage } from "@/game/chat";
import type { MatchRecord } from "@/game/record";
import type { ThemeSet } from "@/game/theme-sets";
import type {
  ActiveRoom,
  Character,
  Identity,
  Lang,
  Localized,
  Phase,
  PlayerId,
  PublicRoom,
  RoomState,
  Theme,
} from "@/game/types";
import type { Me } from "../contract";
import type { PickFeedback, PopularPick } from "../theme-picks";

export interface StoredRoom {
  state: RoomState;
  /** Bumped by every successful write; used for compare-and-swap. */
  version: number;
}

export interface RoomStore {
  get(code: string): Promise<StoredRoom | null>;
  /** Fails (returns false) if the code is already taken. */
  create(state: RoomState): Promise<boolean>;
  /** Writes `next` only if the stored version is still `expectedVersion`. */
  compareAndSwap(
    code: string,
    expectedVersion: number,
    next: RoomState,
  ): Promise<boolean>;
  /** Rooms to list (public and private, see toPublicRoom), newest first. */
  listPublic(): Promise<PublicRoom[]>;
  /** Rooms not closed and written since `since` (ms), for counting the players online. */
  listActive(since: number): Promise<ActiveRoom[]>;
  /** Codes of the recent rooms in one of `phases` where `playerId` has a seat. */
  withPlayer(playerId: PlayerId, phases: readonly Phase[]): Promise<string[]>;
}

export interface NewCharacter {
  /** "u-<uuid>" fixed in advance (a pick draft's newId): creating it again returns the one made first. */
  id?: string;
  lang: Lang;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  createdBy: PlayerId;
}

/** One of a theme's starters: famous characters picked by hand for it (table theme_starters). */
export interface ThemeStarter {
  themeId: string;
  /** The theme's set; null for a theme that is no longer drawn. */
  set: ThemeSet | null;
  /** Language-free library id: "wd-Q302", "al-40". */
  characterId: string;
  /** 1 and 2 are the clearest fits. */
  position: number;
  /** A real person or a made-up character, as the library knows it. */
  kind: "fictional" | "human" | null;
}

export interface CharacterStore {
  /** Accent-, case- and kana-insensitive; best matches first, then most popular. */
  search(query: string, lang: Lang, limit: number): Promise<Character[]>;
  get(id: string): Promise<Character | null>;
  /** The ones of `ids` (app ids) that exist in `lang`, in one read. */
  getMany(ids: string[], lang: Lang): Promise<Character[]>;
  /** Inserts only. With an `id` it is idempotent: an id already there comes back as it is. */
  create(input: NewCharacter): Promise<Character>;
  setImage(id: string, imageUrl: string): Promise<Character | null>;
  /** Used when a player lets the clock run out while picking. */
  randomPopular(lang: Lang, count: number): Promise<Character[]>;
  /** What changed since the library files were built: characters players created, pictures they swapped (id -> url). */
  extras(lang: Lang): Promise<{
    created: Character[];
    images: Record<string, string>;
  }>;
  /** Every active theme's starters, by theme then position (cached; local mode has none). */
  starters(): Promise<ThemeStarter[]>;
}

/** Where the theme list lives: the fixtures locally, a table on Supabase. */
export interface ThemeStore {
  /** Every theme that may be drawn. */
  list(): Promise<Theme[]>;
}

export interface ThemeSource {
  /** `count` different themes in the three languages, from `sets` (every set when left out) while they have enough. Never throws: falls back to the list in hand. */
  draw(
    avoid: Localized[],
    count: number,
    sets?: readonly ThemeSet[],
  ): Promise<Theme[]>;
  /** Instant, no network: from the list in hand (src/server/themes.ts). */
  drawFromBank(count: number, sets?: readonly ThemeSet[]): Theme[];
}

export interface FileStore {
  /** Stores bytes and returns a public URL. */
  put(
    folder: "characters" | "avatars",
    bytes: Uint8Array,
    contentType: string,
  ): Promise<string>;
}

export interface AuthService {
  /** The current person. Creates a guest on first contact. May set cookies. */
  me(lang: Lang): Promise<Me>;
  identity(lang: Lang): Promise<Identity>;
  updateProfile(patch: {
    name?: string;
    avatar?: Identity["avatar"];
  }): Promise<Me>;
  signOut(): Promise<void>;
  /** Local mode only: turns the current guest into a fake account so the profile screen can be tried. */
  enterTestAccount?(provider: "discord" | "google"): Promise<Me>;
}

export interface Notifier {
  /** Tell everyone in the room that its state changed. Best effort. */
  roomChanged(code: string, version: number): Promise<void>;
  /** Tell home screens that the public room list changed. Best effort. */
  lobbyChanged(): Promise<void>;
  /** New chat lines in the room; `id` is the newest. A ping only, never the text (topics are public). Best effort. */
  chatChanged(code: string, id: number): Promise<void>;
}

export type { NewChatMessage };

/** Room chat (src/game/chat.ts): out of RoomState, so it never races the game's compare-and-swap. */
export interface ChatStore {
  /**
   * Saves lines in order and returns them with id and times. A player's line
   * past CHAT_LIMITS (per author and room, across server instances) fails
   * with rate_limited.
   */
  add(code: string, items: NewChatMessage[]): Promise<ChatMessage[]>;
  /** Lines created at or after `since` (ms), oldest first, at most `limit` (the newest ones when cut). */
  list(code: string, since: number, limit: number): Promise<ChatMessage[]>;
  /** The room closed: its chat goes. */
  clear(code: string): Promise<void>;
  /** Chats of rooms that died without closing: every line older than `before` (ms). */
  prune(before: number): Promise<void>;
  /** A guest signed in: their lines, and the system lines naming them, become the account's. */
  reassign(from: PlayerId, to: PlayerId): Promise<void>;
}

/** Finished matches, kept per player (not shown anywhere yet). */
export interface MatchStore {
  /** Saves a finished match; saving the same match id again does nothing. */
  record(match: MatchRecord): Promise<void>;
  /** A guest signed in to an account that already existed: their matches move to it. */
  reassign(fromUserId: string, toUserId: string): Promise<void>;
  /** Characters people picked (not the clock) in finished matches with this theme, most picked first. */
  popularPicks(themeId: string, limit: number): Promise<PopularPick[]>;
  /** Saves whether a player liked a character for a theme (drawn, or discovered); a new answer replaces theirs. */
  rateDraw(feedback: PickFeedback): Promise<void>;
}

export interface Backend {
  rooms: RoomStore;
  matches: MatchStore;
  characters: CharacterStore;
  themes: ThemeSource;
  files: FileStore;
  auth: AuthService;
  notify: Notifier;
  chat: ChatStore;
}
