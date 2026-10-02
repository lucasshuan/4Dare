// The whole game in types. Everything else (engine, server, UI) is written against this file.
import { DEFAULT_GAME, type GameKey } from "./games";
import { THEME_SET_KEYS, type ThemeSet } from "./theme-sets";

export const LANGS = ["en", "pt", "ja"] as const;
export type Lang = (typeof LANGS)[number];
export type Localized = Record<Lang, string>;

/** A theme in the three languages. `set` is its theme set; null when the host typed it in (the same text in every language). */
export interface Theme extends Localized {
  set: ThemeSet | null;
}

/** Always shown in this order. */
export const ANSWERS = [
  "yes",
  "probably_yes",
  "unknown",
  "probably_no",
  "no",
  "irrelevant",
] as const;
export type AnswerValue = (typeof ANSWERS)[number];

export type PlayerId = string;

/** `color` is always set: the pastel behind a critter or an image. `color` alone is the older look (initial or person icon). */
export type Avatar =
  | { kind: "critter"; seed: string; color: string }
  | { kind: "color"; color: string }
  | { kind: "image"; url: string; color: string };

/** Seeds for DiceBear critters: short, URL-safe. */
export const CRITTER_SEED = /^[a-z0-9]{1,16}$/;

/** Who someone is. Guests have no name: the UI turns guestNumber into "WonderfulCat" / "GatoMaravilhoso" / "すてきなネコ" (see guest-names.ts). */
export interface Identity {
  id: PlayerId;
  isGuest: boolean;
  name: string | null;
  guestNumber: number;
  avatar: Avatar;
  lang: Lang;
}

export interface RoomSettings {
  /** The game the room plays; the host can switch it in the lobby. */
  game: GameKey;
  /** The room's name, up to ROOM_NAME_MAX characters; empty shows "<host>'s room". */
  name: string;
  visibility: "public" | "private";
  seats: 2 | 3 | 4;
  /** Seconds per step: 30..300, default 120. */
  stepSeconds: number;
  mode: "classic";
  /** "vote": everyone votes on themes drawn from `themeSets`. "host": the host types the theme. */
  themeMode: "vote" | "host";
  /** The theme sets a vote draws from: at least one. */
  themeSets: ThemeSet[];
}

export const DEFAULT_SETTINGS: RoomSettings = {
  game: DEFAULT_GAME,
  name: "",
  visibility: "public",
  seats: 4,
  stepSeconds: 120,
  mode: "classic",
  themeMode: "vote",
  themeSets: [...THEME_SET_KEYS],
};
export const ROOM_NAME_MAX = 25;
export const STEP_SECONDS_MIN = 30;
export const STEP_SECONDS_MAX = 300;
/** The lobby always waits 2 minutes, whatever the step time is. */
export const LOBBY_SECONDS = 120;
/** The podium stays this long; then the room goes back to the lobby on its own (the host can go sooner). */
export const RESULT_SECONDS = 15;
/** Themes offered in the vote before each match, and how long the vote lasts. */
export const THEME_OPTIONS = 3;
export const VOTE_SECONDS = 8;
/** How long the host has to type the theme; then everyone votes instead, on themes from every set. */
export const HOST_THEME_SECONDS = 30;
/** Ideas shown to the host while they type the theme. */
export const THEME_IDEAS = 12;
export const MAX_THEME = 50;
export const MAX_QUESTION = 140;
export const MAX_NOTE = 200;
export const MAX_GUESS = 80;
export const MAX_NAME = 16;

/**
 * How long everyone looks at a reveal before the next step's clock starts (ms).
 * Answers: a base for the entrance and the question, plus time to read each answer and its note,
 * kept between 6 and 10 seconds. Guesses: a quick "not yet", a longer moment for a hit (card flip, confetti).
 */
export const REVEAL_TIMING = {
  answersBase: 4000,
  perAnswer: 1000,
  perNoteChar: 60,
  answersMin: 6000,
  answersMax: 10000,
  guessMiss: 2500,
  guessHit: 3500,
  /** The theme takes the stage before picking (after a vote, with a short spotlight on the winner first); a tie first spins between the tied themes. */
  theme: 3000,
  themeTieSpin: 2000,
} as const;

/** One row of a language's character library. */
export interface Character {
  id: string;
  lang: Lang;
  name: string;
  origin: string | null;
  imageUrl: string | null;
  /** Other spellings and other-language names; only used to match guesses. */
  aliases: string[];
}

export type Phase =
  | "lobby"
  /** The host types the theme (theme mode "host"). */
  | "theming"
  /** Everyone votes for one of three themes. */
  | "voting"
  | "picking"
  | "asking"
  | "answering"
  | "guessing"
  | "validating"
  | "finished"
  /** Lobby expired with a single player, or everyone left. */
  | "closed";

export interface RoomPlayer extends Identity {
  ready: boolean;
  joinedAt: number;
  /** Consecutive turns lost to the clock; at 2 the player is treated as having given up. */
  strikes: number;
  /** Left the match (or struck out). Never asked to act again; answers default to "unknown". */
  away: boolean;
}

/** Keyed by the player who must discover the character. */
export interface Assignment {
  pickerId: PlayerId;
  character: Character | null;
  /** The clock picked it (the picker let the time run out). */
  auto?: true;
}

export interface AnswerEntry {
  by: PlayerId;
  value: AnswerValue;
  note: string | null;
}

/** A "jogada". Questions and guesses share one numbering. */
export type Play =
  | {
      n: number;
      kind: "question";
      by: PlayerId;
      text: string;
      answers: AnswerEntry[];
      /** Still being answered; not part of the visible history yet. */
      open: boolean;
    }
  | {
      n: number;
      kind: "guess";
      by: PlayerId;
      text: string;
      result: "hit" | "miss" | "pending";
    };

export interface Outcome {
  /** Number of the jogada that discovered the character. */
  discoveredAt: number | null;
  /** 1 = first to discover. */
  place: number | null;
  gaveUp: boolean;
  /** Epoch ms when the player discovered, gave up, left or timed out. */
  endedAt: number | null;
}

/** The vote that picks the theme of a match. */
export interface ThemeVote {
  options: Theme[];
  /** Option index by voter. Players may change their vote until everyone has voted. */
  votes: Record<PlayerId, number>;
  /** The winner, once the vote is over. */
  chosen: number | null;
  /** Options that tied for the most votes; the draw picked `chosen` among them. */
  tied: number[];
}

/** The moment everyone sees between two steps. The play itself (answers, result) lives in `plays`. */
export interface Reveal {
  kind: "answers" | "guess" | "theme";
  /** Number of the jogada being revealed (the round, for a theme). */
  n: number;
  startsAt: number;
  until: number;
}

export interface RoomState {
  code: string;
  hostId: PlayerId;
  settings: RoomSettings;
  phase: Phase;
  /** Seat order (join order). */
  players: RoomPlayer[];
  /** Turn order, set when the match starts. */
  order: PlayerId[];
  theme: Theme | null;
  /** The theme vote of the current round; kept after it closes, for the reveal. Null when the host typed the theme. */
  vote: ThemeVote | null;
  /** Ideas for the host while they type the theme. */
  ideas: Theme[];
  assignments: Record<PlayerId, Assignment>;
  turnPlayerId: PlayerId | null;
  plays: Play[];
  outcomes: Record<PlayerId, Outcome>;
  /** Epoch ms when the current step ends. */
  deadline: number | null;
  /** Epoch ms when the current step's clock starts: later than "now" while a reveal is showing. */
  stepStartsAt: number | null;
  /** The latest reveal; only shown while it lasts. */
  reveal: Reveal | null;
  /** Counts matches played in this room. */
  round: number;
  /** Epoch ms when the first question of this match could be asked (picks done); null before. */
  playStartedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type GameEvent =
  | { type: "JOIN"; player: Identity }
  | { type: "LEAVE"; playerId: PlayerId }
  | { type: "SET_READY"; playerId: PlayerId; ready: boolean }
  | {
      type: "UPDATE_SETTINGS";
      playerId: PlayerId;
      settings: Partial<RoomSettings>;
    }
  /** Name or avatar changed while sitting in the room. */
  | { type: "UPDATE_IDENTITY"; player: Identity }
  /** A guest signed in: the account takes the guest's seat, history and all. */
  | { type: "SWAP_PLAYER"; from: PlayerId; player: Identity }
  /** `themes`: the THEME_OPTIONS themes put to the vote, or ideas for a host who types the theme. */
  | { type: "START"; playerId: PlayerId; themes: Theme[] }
  | { type: "VOTE"; playerId: PlayerId; option: number }
  /** The host typed the theme. */
  | { type: "SET_THEME"; playerId: PlayerId; text: string }
  | { type: "PICK"; playerId: PlayerId; character: Character }
  | { type: "ASK"; playerId: PlayerId; text: string }
  | {
      type: "ANSWER";
      playerId: PlayerId;
      value: AnswerValue;
      note: string | null;
    }
  | { type: "GUESS"; playerId: PlayerId; text: string }
  | { type: "PASS"; playerId: PlayerId }
  | { type: "VALIDATE"; playerId: PlayerId; correct: boolean }
  | { type: "GIVE_UP"; playerId: PlayerId }
  /** Host only, from the podium: everyone goes back to the lobby for another match. */
  | { type: "BACK_TO_LOBBY"; playerId: PlayerId }
  /**
   * The step's clock ran out. The caller supplies what the engine cannot make up:
   * themes to vote on or ideas (lobby auto-start, a host who never typed the theme)
   * and popular characters (picking).
   */
  | {
      type: "TIMEOUT";
      themes?: Theme[];
      fallbackCharacters?: Character[];
    };

export interface Ctx {
  now: number;
  /** 0..1, injectable so tests are deterministic. */
  random: () => number;
}

export const ERROR_CODES = [
  "not_found",
  "room_full",
  "already_started",
  "not_member",
  "not_host",
  "not_your_turn",
  "wrong_phase",
  "invalid_input",
  "need_two_players",
  "already_done",
  "conflict",
  "unauthorized",
  "upload_failed",
  "rate_limited",
  /** The step has not started yet: a reveal is still on screen. */
  "too_early",
  /** Too few characters were picked for this theme in past matches to draw one. */
  "not_enough_picks",
  "unknown",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export class GameError extends Error {
  constructor(public code: ErrorCode) {
    super(code);
    this.name = "GameError";
  }
}

// ---------------------------------------------------------------------------
// What one player is allowed to see. The server builds this; the browser never
// receives RoomState.
// ---------------------------------------------------------------------------

export type PlayerStatus =
  // lobby
  | "host"
  | "ready"
  | "not_ready"
  // the host typing the theme (the others wait)
  | "theming"
  // voting
  | "voting"
  | "voted"
  // picking
  | "picking"
  | "picked"
  // turn
  | "asking"
  | "will_answer"
  | "answering"
  | "answered"
  | "guessing"
  | "validating"
  | "waiting"
  // end states
  | "discovered"
  | "gave_up";

export interface CardView {
  characterId: string;
  name: string;
  origin: string | null;
  imageUrl: string | null;
}

export interface PlayerView {
  id: PlayerId;
  isYou: boolean;
  isHost: boolean;
  isGuest: boolean;
  name: string | null;
  guestNumber: number;
  avatar: Avatar;
  ready: boolean;
  status: PlayerStatus;
  /** It is this player's turn (the ring in the player strip). */
  isTurn: boolean;
  /** Null while it must stay secret from the viewer, or before it is picked. */
  card: CardView | null;
  /** True when it is the viewer's own card and they have not discovered it yet. */
  cardHidden: boolean;
  /** Who picked this player's character. Null while secret (your own, before the end). */
  pickedById: PlayerId | null;
  discoveredAt: number | null;
  place: number | null;
  gaveUp: boolean;
  /** Left the room mid-match. */
  away: boolean;
}

export type HistoryEntryView =
  | {
      n: number;
      kind: "question";
      byId: PlayerId;
      text: string;
      answers: { byId: PlayerId; value: AnswerValue; note: string | null }[];
    }
  | {
      n: number;
      kind: "guess";
      byId: PlayerId;
      text: string;
      result: "hit" | "miss";
    };

export interface TurnView {
  /** Number of the jogada being played. */
  n: number;
  playerId: PlayerId;
  /** Set from "answering" on. */
  question: string | null;
  /** Who has answered so far (answering). */
  answeredIds: PlayerId[];
  yourAnswer: { value: AnswerValue; note: string | null } | null;
  /** Everyone's answers, visible once the question is resolved (guessing, validating). */
  answers: { byId: PlayerId; value: AnswerValue; note: string | null }[] | null;
  /** The guess under validation. */
  guess: string | null;
  /** The only player who is asked whether the guess is right: whoever picked that character. */
  validatorId: PlayerId | null;
}

export type RevealView =
  /** The theme vote is over; the vote screen plays it out (see VoteView). */
  | { kind: "theme"; n: number; startsAt: number; until: number }
  | {
      kind: "answers";
      n: number;
      byId: PlayerId;
      question: string;
      answers: { byId: PlayerId; value: AnswerValue; note: string | null }[];
      startsAt: number;
      until: number;
    }
  | {
      kind: "guess";
      n: number;
      byId: PlayerId;
      guess: string;
      result: "hit" | "miss";
      /** The guesser's character, when the viewer may see it (always on a hit). */
      card: CardView | null;
      /** Place reached with this hit (1 = first). */
      place: number | null;
      startsAt: number;
      until: number;
    };

export interface VoteView {
  options: Theme[];
  /** Votes are open: everyone sees who voted for what. */
  votes: { byId: PlayerId; option: number }[];
  yourVote: number | null;
  chosen: number | null;
  tied: number[];
  /** How many players vote. */
  total: number;
}

export interface PickView {
  /** The player you are picking for. */
  targetId: PlayerId;
  confirmed: boolean;
  character: CardView | null;
  confirmedIds: PlayerId[];
  total: number;
}

export interface RoomView {
  code: string;
  phase: Phase;
  settings: RoomSettings;
  round: number;
  version: number;
  youId: PlayerId;
  hostId: PlayerId;
  players: PlayerView[];
  theme: Theme | null;
  deadline: number | null;
  /** When the current step's clock starts. Before that a reveal is on screen and the timer refills. */
  stepStartsAt: number | null;
  /** Shown to everyone until `reveal.until`; null when nothing is being revealed. */
  reveal: RevealView | null;
  /** Server clock when this view was built; use it to correct the countdown. */
  serverNow: number;
  /** Present while voting and while the chosen theme is revealed. */
  vote: VoteView | null;
  /** The host only, while they type the theme. */
  ideas: Theme[] | null;
  /** Present while picking. */
  pick: PickView | null;
  /** Present from "asking" to "validating". */
  turn: TurnView | null;
  /** Resolved jogadas, oldest first. */
  history: HistoryEntryView[];
  /** Host only: the match can start (2+ players). */
  canStart: boolean;
}

/** A waiting public room, as listed on the home screen. */
export interface PublicRoom {
  code: string;
  /** Empty when the host left it unnamed. */
  name: string;
  /** open: has a free seat; full: lobby with no seat left; playing: match under way. */
  status: "open" | "full" | "playing";
  host: Pick<Identity, "isGuest" | "name" | "guestNumber" | "avatar" | "lang">;
  players: number;
  seats: number;
  stepSeconds: number;
}
