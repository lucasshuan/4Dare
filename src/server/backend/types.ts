// The backend in five small interfaces. Two implementations exist:
//   local    → everything in memory / on disk, zero setup (dev, tests)
//   supabase → Postgres, Storage, Realtime, Auth
// Server actions and route handlers only talk to these interfaces (via getBackend()).

import type { Category } from "@/game/categories";
import type { ChatMessage, NewChatMessage } from "@/game/chat";
import type { GameKey } from "@/game/games";
import type { Gosto, ThemeFilter } from "@/game/gostos";
import type { BankQuestion } from "@/game/impostor/questions";
import type { BankExtra, BankMission } from "@/game/lineup/bank";
import type { PoolCard } from "@/game/lineup/deal";
import type { LuKeptBoard } from "@/game/lineup/record";
import type { SyncedSettings } from "@/game/options";
import type { PlayedMatch } from "@/game/profile/history";
import type {
  About,
  Banner,
  Privacy,
  ShowcaseItem,
} from "@/game/profile/profile";
import type { MatchRecord } from "@/game/record";
import type { ThemeSet } from "@/game/theme-sets";
import type {
  ActiveRoom,
  Avatar,
  Character,
  Identity,
  Lang,
  ListedRoom,
  Localized,
  Phase,
  PlayerId,
  RoomState,
  Theme,
} from "@/game/types";
import type { Account, AccountInfo } from "../contract";
import type { FitVote, PickStat } from "../theme-picks";

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
  listPublic(): Promise<ListedRoom[]>;
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

/** One of a theme's starters: famous characters picked by hand for it (table whoami_theme_starters). */
export interface ThemeStarter {
  themeId: string;
  /** The theme's set; null for a theme that is no longer drawn. */
  set: ThemeSet | null;
  /** Language-free library id: "wd-Q302", "al-40". */
  characterId: string;
  /** "all": shared; a language: one of its own, ranked among the shared ones for its players. */
  lang: Lang | "all";
  /** 1 and 2 are the clearest fits (counted within the starter's language). */
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
  /** Used when a player lets the clock run out while picking. */
  randomPopular(lang: Lang, count: number): Promise<Character[]>;
  /** What changed since the library files were built: characters players created, covers that moved to a player's picture (id -> url). */
  extras(lang: Lang): Promise<{
    created: Character[];
    images: Record<string, string>;
  }>;
  /** Every active theme's starters, by theme, language then position (cached; local mode has none). */
  starters(): Promise<ThemeStarter[]>;
  /** The characters a player made, each in the language it was named in, newest first. */
  createdBy(playerId: PlayerId, limit: number): Promise<Character[]>;
  /** What the Impostor's deal weighs about library characters (language-free ids), in `lang`. */
  facts(ids: string[], lang: Lang): Promise<CharacterFacts[]>;
  /** The popularity a character needs in `lang` to count as known: the `rank`th best known's; null: everyone counts. */
  knownFloor(lang: Lang, rank: number): Promise<number | null>;
}

export interface CharacterFacts {
  /** Language-free ("wd-Q302"). */
  id: string;
  category: Category | null;
  /** Its work or job by its English label: two ids of one work match. */
  work: string | null;
  popularity: number | null;
  gostos: Gosto[] | null;
}

/** One question's part in a finished match, in the match's language. */
export interface QuestionCount {
  id: string;
  lang: Lang;
  asked: number;
  silent: number;
  stoodOut: number;
  caught: number;
}

/** The Impostor's question bank: the live questions, and what they did in play. */
export interface ImpostorStore {
  /** Every live question (cached). */
  list(): Promise<BankQuestion[]>;
  count(rows: QuestionCount[]): Promise<void>;
}

/** Who sent a picture, as they looked then. */
export type ImageAuthor = Pick<
  Identity,
  "name" | "isGuest" | "guestNumber" | "avatar"
>;

/**
 * pending: the detector could not tell yet, so only its author sees it;
 * hidden: reported by enough people.
 */
export type ImageStatus = "pending" | "active" | "hidden";

/** A picture of a character (table character_images). */
export interface CharacterImage {
  id: string;
  /** Language-free ("wd-Q302", "u-<uuid>"); null while it waits on a pick card for a new name. */
  characterId: string | null;
  url: string;
  /** null for the library's own picture. */
  createdBy: PlayerId | null;
  author: ImageAuthor | null;
  status: ImageStatus;
  /** Head start, players who chose it, the square root of those who kept it as shown, two off per report: the best one is the cover. */
  score: number;
}

export interface NewImage {
  characterId: string | null;
  url: string;
  createdBy: PlayerId;
  author: ImageAuthor;
  status: "pending" | "active";
  /** The detector's scores or error, kept to tune it. */
  moderation: unknown;
}

/** Pictures of characters; the cover (the character's imageUrl) is always the best active one. */
export interface ImageStore {
  add(input: NewImage): Promise<CharacterImage>;
  get(id: string): Promise<CharacterImage | null>;
  /** The picture with `url` among a character's (language-free id), or among the unattached ones (null). */
  find(characterId: string | null, url: string): Promise<CharacterImage | null>;
  /** What a viewer may see of a character's pictures: the active ones and their own pending ones, best first. */
  list(
    characterId: string,
    viewer: PlayerId,
    limit: number,
  ): Promise<CharacterImage[]>;
  /** Makes `image` a picture of `characterId` too: the same row when it waits unattached, else a copy. */
  attach(image: CharacterImage, characterId: string): Promise<void>;
  /**
   * A confirmed card showed this picture, `chosen` on purpose (a tray choice,
   * their upload) or kept as the cover the card showed: once per player
   * (choosing it later upgrades a keep), and the cover follows the score.
   */
  recordPick(
    characterId: string,
    url: string,
    playerId: PlayerId,
    chosen: boolean,
  ): Promise<void>;
  /** One report per player; a player's picture is hidden at `hideAt`. The status after it. */
  report(
    id: string,
    reporterId: PlayerId,
    hideAt: number,
  ): Promise<ImageStatus | null>;
  /** Pictures still waiting on the detector, oldest first. */
  pending(limit: number): Promise<CharacterImage[]>;
  /** The detector cleared a waiting picture: everyone sees it, and it may become the cover. */
  approve(id: string, moderation: unknown): Promise<void>;
  /** The row goes (not its file). */
  remove(id: string): Promise<void>;
  /** Pictures sent for a new name that never became a character, sent before `before` (ms). */
  orphans(before: number, limit: number): Promise<CharacterImage[]>;
  /** A player's pictures of characters, newest first: the active ones, and the pending ones when `withPending`. */
  byAuthor(
    playerId: PlayerId,
    withPending: boolean,
    limit: number,
  ): Promise<CharacterImage[]>;
}

/**
 * A theme as the list keeps it: its id (theme-id.ts), the games it serves
 * (one theme, both games, one name) and the gostos of its shared starters,
 * clearest first (null for a starter with none yet).
 */
export interface CatalogTheme extends Theme {
  id: string;
  games: GameKey[];
  gostos: (Gosto[] | null)[];
}

/** Where the theme list lives: the fixtures locally, a table on Supabase. */
export interface ThemeStore {
  /** Every theme that may be drawn. */
  list(): Promise<CatalogTheme[]>;
}

export interface ThemeSource {
  /** `count` different themes in every language that `filter` lets in, while it lets enough in. Never throws: falls back to the list in hand. */
  draw(
    avoid: Localized[],
    count: number,
    filter?: ThemeFilter,
  ): Promise<Theme[]>;
  /** Instant, no network: from the list in hand (src/server/themes.ts). */
  drawFromBank(count: number, filter?: ThemeFilter): Theme[];
  /** The whole list as the room setup shows it, read as draws read it. */
  catalog(): Promise<CatalogTheme[]>;
}

export interface FileStore {
  /** Stores bytes and returns a public URL. */
  put(
    folder: "characters" | "avatars",
    bytes: Uint8Array,
    contentType: string,
  ): Promise<string>;
  /** Deletes a character picture this store made (see uploadedPath); anything else is left alone. */
  remove(url: string): Promise<void>;
}

export interface AuthService {
  /** The current person. Creates a guest on first contact. May set cookies. */
  me(lang: Lang): Promise<Account>;
  identity(lang: Lang): Promise<Identity>;
  updateProfile(patch: {
    name?: string;
    avatar?: Identity["avatar"];
  }): Promise<Account>;
  /** Ends this session, or (`everywhere`) every session of the account. */
  signOut(everywhere?: boolean): Promise<void>;
  /** Local mode only: turns the current guest into a fake account so the profile screen can be tried. */
  enterTestAccount?(provider: "discord" | "google"): Promise<Account>;
  /** The signed-in account's e-mail and providers; null for a guest. */
  accountInfo(): Promise<AccountInfo | null>;
  /** Unlinks a provider; the last one stays (an account needs one to sign in). */
  unlink(provider: "discord" | "google"): Promise<void>;
  /**
   * Deletes the signed-in account: its user, profile, mural and badges go;
   * its matches stay, without a name ("anonymous").
   */
  deleteAccount(): Promise<void>;
}

/** An account's profile (table profiles); guests have none. */
export interface StoredProfile {
  id: PlayerId;
  handle: string;
  name: string | null;
  guestNumber: number;
  avatar: Avatar;
  /** When the account was made (ms). */
  createdAt: number;
  quote: string | null;
  /** The colour of the XP ring, the tabs and the garden's flowers; null for the default. */
  accent: string | null;
  banner: Banner | null;
  showcase: ShowcaseItem[];
  about: About;
  privacy: Privacy;
  /** When the handle last changed (ms); null if it never did. */
  handleChangedAt: number | null;
}

/** What the owner can change on their profile (name and avatar go through AuthService). */
export type ProfilePatch = Partial<
  Pick<
    StoredProfile,
    | "handle"
    | "quote"
    | "accent"
    | "banner"
    | "showcase"
    | "about"
    | "privacy"
    | "handleChangedAt"
  >
> & { settings?: SyncedSettings };

export interface ProfileStore {
  byHandle(handle: string): Promise<StoredProfile | null>;
  /** The accounts among `ids` (guests have none), in one read. */
  byIds(ids: string[]): Promise<StoredProfile[]>;
  /** Fails with handle_taken when another account has the new handle. */
  update(id: PlayerId, patch: ProfilePatch): Promise<StoredProfile>;
}

/** A line on a profile's mural (table profile_comments). */
export interface StoredComment {
  id: number;
  profileId: PlayerId;
  authorId: PlayerId;
  /** The top line it answers; null for a top line. */
  parentId: number | null;
  body: string;
  /** Reported by enough people: only its author still sees it. */
  hidden: boolean;
  createdAt: number;
}

export interface MuralStore {
  /**
   * Top lines newest first, at most `limit`, older than `before` (ms) when
   * given, with every reply to them, oldest first; `more` when older ones wait.
   */
  page(
    profileId: PlayerId,
    before: number | null,
    limit: number,
  ): Promise<{
    lines: StoredComment[];
    replies: StoredComment[];
    more: boolean;
  }>;
  get(id: number): Promise<StoredComment | null>;
  /**
   * The new line's id; null past 8 lines a minute or 60 a day from its
   * author. A reply must answer a top line of the same mural.
   */
  post(input: {
    profileId: PlayerId;
    authorId: PlayerId;
    parentId: number | null;
    body: string;
  }): Promise<number | null>;
  /** The line goes, and its replies with it. */
  remove(id: number): Promise<void>;
  /** One report per person; the third hides the line. Whether it is hidden now. */
  report(id: number, reporterId: PlayerId): Promise<boolean>;
}

/** When each badge tier was first reached (table user_badges). */
export interface BadgeStore {
  /** "matches.silver" → when (ms). */
  earned(userId: PlayerId): Promise<Map<string, number>>;
  /** Keeps tiers reached now; one already kept keeps its day. */
  grant(
    userId: PlayerId,
    tiers: { key: string; game: string | null }[],
  ): Promise<void>;
}

export interface Notifier {
  /** Tell everyone in the room that its state changed. Best effort. */
  roomChanged(code: string, version: number): Promise<void>;
  /** Tell home screens that the public room list changed. Best effort. */
  lobbyChanged(): Promise<void>;
  /** New chat lines in the room; `id` is the newest. A ping only, never the text (topics are public). Best effort. */
  chatChanged(code: string, id: number): Promise<void>;
  /** What for?: reactions to the board on stage, for every screen to float them. Best effort. */
  reacted(
    code: string,
    payload: { board: PlayerId; counts: number[] },
  ): Promise<void>;
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

/** Finished matches, kept per player: profiles read them. */
export interface MatchStore {
  /** Saves a finished match; saving the same match id again does nothing. */
  record(match: MatchRecord): Promise<void>;
  /** Which of these players have finished at least one match. */
  played(userIds: string[]): Promise<Set<string>>;
  /** A guest signed in to an account that already existed: their matches move to it. */
  reassign(fromUserId: string, toUserId: string): Promise<void>;
  /**
   * What a theme knows per character and language: players who picked it in
   * finished matches (once each, the clock's picks left out) and votes on
   * whether it fits. The busiest first, at most `limit`.
   */
  themeStats(themeId: string, limit: number): Promise<PickStat[]>;
  /** Saves whether a character fit a theme for a player (drawn, or discovered); a new answer replaces theirs. */
  voteFit(vote: FitVote): Promise<void>;
  /** A player's finished matches, newest first. */
  history(userId: string): Promise<PlayedMatch[]>;
  /** A player's latest What for? boards, newest first, at most `limit`. */
  boards(userId: string, limit: number): Promise<StoredBoard[]>;
  /** A player's numbers over every game, without reading every match. */
  totals(userId: string): Promise<PlayerTotals>;
  /** Whether two players ever finished a match together. */
  playedTogether(a: string, b: string): Promise<boolean>;
}

export interface PlayerTotals {
  matches: number;
  wins: number;
  timeMs: number;
  xp: number;
}

/** One mission's part in a finished match, in the match's language. */
export interface MissionCount {
  id: string;
  lang: Lang;
  played: number;
  liked: number;
  disliked: number;
  laughs: number;
  ties: number;
}

/** One card's part in a finished match (a library id, or "x:<extra>"). */
export interface CardCount {
  id: string;
  lang: Lang;
  lots: number;
  sold: number;
  price: number;
  traded: number;
  won: number;
}

/** A What for? board as a match kept it (lineup_boards), with its round's mission. */
export interface StoredBoard {
  matchId: string;
  round: number;
  finishedAt: number;
  /** The bank's mission in every language; null for one somebody wrote. */
  mission: Localized | null;
  missionText: string | null;
  board: LuKeptBoard;
  spent: number;
  votes: number;
  tieVotes: number | null;
  laughs: number;
  won: boolean;
  crowd: boolean;
}

/** What for?'s hand-made banks, a language's deck, and what matches did with them. */
export interface LineupStore {
  /** Every live mission (cached). */
  missions(): Promise<BankMission[]>;
  /** Every live extra (cached). */
  extras(): Promise<BankExtra[]>;
  /** A language's deck, best known first (cached). */
  pool(lang: Lang): Promise<PoolCard[]>;
  count(missions: MissionCount[], cards: CardCount[]): Promise<void>;
  /** Library ids kept off the auction (lineup_blocked; cached). */
  blocked(): Promise<Set<string>>;
  /** A language's dearest cards on average, among those sold often enough to tell (cached). */
  priciest(lang: Lang): Promise<{ id: string; sold: number; avg: number }[]>;
}

export interface Backend {
  rooms: RoomStore;
  matches: MatchStore;
  characters: CharacterStore;
  impostor: ImpostorStore;
  lineup: LineupStore;
  images: ImageStore;
  themes: ThemeSource;
  files: FileStore;
  auth: AuthService;
  profiles: ProfileStore;
  mural: MuralStore;
  badges: BadgeStore;
  notify: Notifier;
  chat: ChatStore;
}
