import type { GameKey } from "@/game/games";
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

/** What only the control panel reads and writes. */
export interface AdminStore {
  stats(days: number): Promise<AdminStats>;
  audit(entry: AuditEntry): Promise<void>;
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
