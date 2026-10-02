// The backend in five small interfaces. Two implementations exist:
//   local    → everything in memory / on disk, zero setup (dev, tests)
//   supabase → Postgres, Storage, Realtime, Auth
// Server actions and route handlers only talk to these interfaces (via getBackend()).

import type { MatchRecord } from "@/game/record";
import type {
  Character,
  Identity,
  Lang,
  Localized,
  PlayerId,
  PublicRoom,
  RoomState,
} from "@/game/types";
import type { Me } from "../contract";

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
  /** Public rooms still waiting in the lobby, newest first. */
  listPublic(): Promise<PublicRoom[]>;
}

export interface NewCharacter {
  lang: Lang;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  createdBy: PlayerId;
}

export interface CharacterStore {
  /** Accent-, case- and kana-insensitive; best matches first, then most popular. */
  search(query: string, lang: Lang, limit: number): Promise<Character[]>;
  get(id: string): Promise<Character | null>;
  create(input: NewCharacter): Promise<Character>;
  setImage(id: string, imageUrl: string): Promise<Character | null>;
  /** Used when a player lets the clock run out while picking. */
  randomPopular(lang: Lang, count: number): Promise<Character[]>;
  /** What changed since the library files were built: characters players created, pictures they swapped (id -> url). */
  extras(lang: Lang): Promise<{
    created: Character[];
    images: Record<string, string>;
  }>;
}

/** Where the theme list lives: the bundled file locally, a table on Supabase. */
export interface ThemeStore {
  /** Every theme that may be drawn. */
  list(): Promise<Localized[]>;
  /** Keeps a theme the AI invented; an existing one is left as it is. */
  add(theme: Localized): Promise<void>;
}

export interface ThemeSource {
  /** A fresh theme in the three languages. Never throws: falls back to the built-in bank. */
  draw(avoid: Localized[]): Promise<Localized>;
  /** Instant, no network: straight from the bank. */
  drawFromBank(): Localized;
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
}

/** Finished matches, kept per player (not shown anywhere yet). */
export interface MatchStore {
  /** Saves a finished match; saving the same match id again does nothing. */
  record(match: MatchRecord): Promise<void>;
  /** A guest signed in to an account that already existed: their matches move to it. */
  reassign(fromUserId: string, toUserId: string): Promise<void>;
}

export interface Backend {
  rooms: RoomStore;
  matches: MatchStore;
  characters: CharacterStore;
  themes: ThemeSource;
  files: FileStore;
  auth: AuthService;
  notify: Notifier;
}
