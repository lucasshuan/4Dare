import type { GameKey } from "@/game/games";
import type { QuestionKind } from "@/game/impostor/types";
import type { Tone } from "@/game/lineup/bank";
import type { ThemeSet } from "@/game/theme-sets";
import type { Lang } from "@/game/types";

/** The control panel's overview, as admin_stats (0054_admin_stats.sql) returns it. */
export interface AdminStats {
  /** When the first match started (ms); null before any. */
  since: number | null;
  matches: number;
  /** Seats played: one per player per match. */
  plays: number;
  /** Distinct people who played (accounts and guests). */
  players: number;
  games: {
    game: GameKey;
    matches: number;
    /** Average length of the finished ones (s); null when none finished. */
    avgSec: number | null;
    last: number;
  }[];
  /** One entry per São Paulo day, oldest first: matches per game. */
  days: { day: string; by: Partial<Record<GameKey, number>> }[];
  langs: Partial<Record<Lang, number>>;
  topThemes: { id: string; name: string; n: number }[];
  topPicks: { id: string; name: string; n: number }[];
  rooms: {
    open: number;
    lobby: number;
    playing: number;
    activeHour: number;
    /** Open with nothing happening for 12 h. */
    stale: number;
  };
  library: {
    characters: number;
    byPlayers: number;
    images: number;
    pending: number;
    pendingSince: number | null;
    aliases: number;
  };
  banks: {
    themesOn: number;
    themesOff: number;
    questions: number;
    spice: Record<1 | 2 | 3, number>;
    missions: number;
    heavy: number;
    extras: number;
    blocked: number;
  };
  workshop: { voting: number; review: number };
  reportsWeek: number;
}

/** One change the panel made (admin_audit, 0053_admin_audit.sql). */
export interface AuditEntry {
  actor: string;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
  note?: string | null;
}

/** What the panel saved (game_config, 0055_game_config.sql): only what differs from the code. */
export interface ConfigValues {
  /** Tunable values by key (src/game/tunables.ts). */
  tunes: Record<string, number | boolean | string>;
  /** Each scene's sounds, by "<game>.<scene>" (the scenes' editor). */
  scenes: Record<string, unknown>;
}

/** One saved version of the config. */
export interface ConfigVersion {
  v: number;
  values: ConfigValues;
  note: string | null;
  author: string | null;
  at: number;
}

/** The banks a game draws from, every row, on or off (the Content tab). */
export interface Banks {
  themes: {
    id: string;
    pt: string;
    set: ThemeSet | null;
    games: GameKey[];
    live: boolean;
  }[];
  questions: {
    id: string;
    pt: string;
    kind: QuestionKind;
    spice: 1 | 2 | 3;
    scope: "general" | "set" | "theme";
    live: boolean;
  }[];
  missions: {
    id: string;
    pt: string;
    tone: Tone;
    heavy: boolean;
    live: boolean;
  }[];
  extras: {
    id: string;
    pt: string;
    emoji: string;
    tint: string;
    live: boolean;
  }[];
}

export type BankKind = "theme" | "question" | "mission" | "extra";

/** A lab scene as kept (lab_scenes, 0056): `params` is the lab's own (features/lab/scene.ts). */
export interface StoredLabScene {
  id: string;
  name: string;
  game: string;
  params: unknown;
  note: string | null;
  author: string | null;
  at: number;
}

/** What only the control panel reads and writes. */
export interface AdminStore {
  stats(days: number): Promise<AdminStats>;
  audit(entry: AuditEntry): Promise<void>;
  /** The config in force (the newest version). */
  config(): Promise<ConfigVersion>;
  /** The newest versions first. */
  versions(limit: number): Promise<ConfigVersion[]>;
  /** Saves a new version; its number. */
  saveConfig(
    values: ConfigValues,
    note: string | null,
    author: string,
  ): Promise<number>;
  /** Every row of the game banks. */
  banks(): Promise<Banks>;
  /** Puts a bank row on or off (never deletes it); whether it was on before, null when there is no such row. */
  setLive(kind: BankKind, id: string, live: boolean): Promise<boolean | null>;
  /** The lab's saved scenes, newest first. */
  labScenes(limit: number): Promise<StoredLabScene[]>;
  labScene(id: string): Promise<StoredLabScene | null>;
  /** Saves a scene; its id. */
  saveLabScene(scene: Omit<StoredLabScene, "id" | "at">): Promise<string>;
  deleteLabScene(id: string): Promise<void>;
  /** Every picture of a character, any status, best first. */
  characterImages(characterId: string): Promise<AdminImage[]>;
  /** Shows or hides a picture (never deletes it); the cover follows. */
  setImageStatus(id: string, status: "active" | "hidden"): Promise<void>;
  /** How many rows the main tables hold (the data map). */
  tableCounts(tables: readonly string[]): Promise<Record<string, number>>;
  /** Closes the rooms with nothing happening for 30 minutes; how many. */
  closeIdle(): Promise<number>;
}

/** A picture as the panel ranks it. */
export interface AdminImage {
  id: string;
  characterId: string | null;
  url: string;
  createdBy: string | null;
  authorName: string | null;
  authorGuest: number | null;
  status: "active" | "pending" | "hidden";
  picks: number;
  keeps: number;
  reports: number;
  bonus: number;
  score: number;
  createdAt: number;
}

/** Saved values read back: what is missing becomes empty. */
export function readValues(raw: unknown): ConfigValues {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const obj = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, never>)
      : {};
  return { tunes: obj(r.tunes), scenes: obj(r.scenes) };
}

/** Stats with nothing in them (local mode, or before any match). */
export function emptyStats(days: number, today = new Date()): AdminStats {
  return {
    since: null,
    matches: 0,
    plays: 0,
    players: 0,
    games: [],
    days: Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      return { day: d.toISOString().slice(0, 10), by: {} };
    }),
    langs: {},
    topThemes: [],
    topPicks: [],
    rooms: { open: 0, lobby: 0, playing: 0, activeHour: 0, stale: 0 },
    library: {
      characters: 0,
      byPlayers: 0,
      images: 0,
      pending: 0,
      pendingSince: null,
      aliases: 0,
    },
    banks: {
      themesOn: 0,
      themesOff: 0,
      questions: 0,
      spice: { 1: 0, 2: 0, 3: 0 },
      missions: 0,
      heavy: 0,
      extras: 0,
      blocked: 0,
    },
    workshop: { voting: 0, review: 0 },
    reportsWeek: 0,
  };
}
