// The numbers of What for?: lots and rounds for a table, what a board may
// hold, and the grid the photos arrive in. Shared by the engine, the server
// (which deals the lots) and the screens.
import type { RoomSettings } from "../types";
import type { LuBoard, LuSticker, LuText } from "./types";

/** Coins each player gets every round: the default and the range the room can set. */
export const COINS = { default: 10, min: 5, max: 20 } as const;
/** Lots per player, plus EXTRA_LOTS, up to MAX_LOTS. */
export const LOTS_PER_SEAT = { default: 3, min: 2, max: 4 } as const;
export const EXTRA_LOTS = 3;
export const MAX_LOTS = 24;
/** Rounds a match can be set to; null lets the table decide (roundsFor). */
export const ROUNDS = { min: 1, max: 3 } as const;

/** The rules a room sets for What for? (its clocks are step times like any game's). */
export type LineupRules = Pick<
  RoomSettings,
  | "coins"
  | "lotsPerSeat"
  | "rounds"
  | "interval"
  | "trades"
  | "heavy"
  | "offMissions"
>;

export const DEFAULT_RULES: LineupRules = {
  coins: COINS.default,
  lotsPerSeat: LOTS_PER_SEAT.default,
  rounds: null,
  interval: true,
  trades: true,
  heavy: true,
  offMissions: [],
};

/** The most missions a room can switch off: about every one there is. */
export const OFF_MISSIONS_MAX = 1000;
const MISSION_ID = /^[a-z0-9-]{1,80}$/;

/** Saved rules read back (a preset, the last setup): what is missing or odd takes its default. */
export function cleanRules(raw: Record<string, unknown>): LineupRules {
  const d = DEFAULT_RULES;
  const int = (
    v: unknown,
    r: { min: number; max: number },
    fallback: number,
  ) =>
    Number.isInteger(v) && (v as number) >= r.min && (v as number) <= r.max
      ? (v as number)
      : fallback;
  const flag = (v: unknown, fallback: boolean) =>
    typeof v === "boolean" ? v : fallback;
  const off = Array.isArray(raw.offMissions) ? raw.offMissions : [];
  return {
    coins: int(raw.coins, COINS, d.coins),
    lotsPerSeat: int(raw.lotsPerSeat, LOTS_PER_SEAT, d.lotsPerSeat),
    rounds: raw.rounds === null ? null : int(raw.rounds, ROUNDS, 0) || null,
    interval: flag(raw.interval, d.interval),
    trades: flag(raw.trades, d.trades),
    heavy: flag(raw.heavy, d.heavy),
    offMissions: [
      ...new Set(
        off.filter(
          (id): id is string => typeof id === "string" && MISSION_ID.test(id),
        ),
      ),
    ]
      .sort()
      .slice(0, OFF_MISSIONS_MAX),
  };
}

/** Lots in a round with `players` bidding. */
export const lotsFor = (players: number, perSeat: number) =>
  Math.min(MAX_LOTS, players * perSeat + EXTRA_LOTS);

/** Rounds in a match: the room's number, or two up to four players and one after. */
export const roundsFor = (players: number, setting: number | null) =>
  setting ?? (players <= 4 ? 2 : 1);

/** Lot indexes after which the auction stops for a break: the middle, or the thirds from 20 lots. */
export function breaksFor(lots: number, on: boolean): number[] {
  if (!on || lots < 6) return [];
  if (lots >= 20)
    return [Math.round(lots / 3) - 1, Math.round((lots * 2) / 3) - 1];
  return [Math.floor(lots / 2) - 1];
}

/** The fixed clocks of a round (ms): the room sets the lot, trades, board and vote. */
export const LU_CLOCKS = {
  /** A lot only one player can still bid on. */
  lone: 4000,
  /** A bid in the lot's last seconds gives this much back. */
  snipe: 5000,
  halftime: 20_000,
  /** Each board on stage; its owner can end it sooner. */
  present: 20_000,
  tiebreak: 15_000,
  /** The round's score, before the next round (or the podium). */
  score: 15_000,
  /** With a presenter: to choose the mission (or write one). */
  choose: 40_000,
  /** With a presenter: the first lot of a round, while their queue is empty. */
  firstLot: 20_000,
  /** With a presenter: a later lot, when their queue ran dry. */
  nextLot: 10_000,
  /** With a presenter: to pick the winning board and say why. */
  verdict: 60_000,
  /** The presenter gave no verdict (or left): the room votes, this quickly. */
  quickVote: 20_000,
} as const;

/** Floors for the cuts each "done" makes (ms). */
export const LU_FLOORS = {
  halftime: 5000,
  trading: 10_000,
  defending: 15_000,
  judging: 8000,
  scoring: 5000,
} as const;

/** Points: one per vote a board gets, and the round's winners get more. */
export const VOTE_POINTS = 1;
export const WIN_POINTS = 2;
/** With a presenter: the board they pick wins this much (no points per vote). */
export const HOST_WIN_POINTS = 3;

// --- the presenter -------------------------------------------------------------

/** People a room needs for a presenter: one presents, at least two play. */
export const HOST_MIN_PEOPLE = 3;
/** A mission the presenter writes: up to this many characters, in up to MISSION_LINES lines. */
export const MISSION_MAX = 200;
export const MISSION_LINES = 4;
/** "What for ____": a player's guess while the presenter chooses. */
export const GUESS_MAX = 80;
/** The presenter's "why": none, or this long. */
export const WHY = { min: 8, max: 100 } as const;
/** The most lots the presenter can line up at once. */
export const QUEUE_MAX = 12;
/** The presenter's remote plays one sound this often at most. */
export const CUE_GAP_MS = 3000;

/** The crowd's prize needs at least this many reactions. */
export const CROWD_MIN = 3;
/** Reactions one player can send a board. */
export const REACT_MAX = 10;

// --- the board ---------------------------------------------------------------

/** The slate, in its own units: every board position is in these. */
export const SLATE = { w: 372, h: 572 } as const;
/** Photos are 4:5; their width on the slate. */
export const STICKER_W = { min: 48, max: 200 } as const;
export const TILT_MAX = 60;
export const TEXT_SIZE = { min: 12, max: 40 } as const;
export const MAX_TEXTS = 10;
export const MAX_TEXT = 40;
export const MAX_TEXT_LINES = 3;
export const MAX_TEAM_NAME = 28;

/** Photo width by team size, before anyone moves them: small, so words fit around. */
function gridSize(n: number) {
  return n <= 1 ? 120 : n === 2 ? 104 : n <= 4 ? 92 : n <= 6 ? 80 : 70;
}

/** Photos lean a little as they come, each its own way. */
const GRID_TILTS = [-4, 3, -2, 4, -3, 2, -1, 3, -4];

/** Where `n` photos sit as they come from the auction: a centred grid. */
export function gridSpots(n: number): Omit<LuSticker, "c">[] {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
  const size = gridSize(n);
  const rowH = Math.round(size * 1.25) + 46;
  const colW = SLATE.w / cols;
  const top = 80;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, n - row * cols);
    return {
      x: Math.round((SLATE.w - inRow * colW) / 2 + (col + 0.5) * colW),
      y: Math.round(top + row * rowH + (size * 1.25) / 2 + 6),
      w: size,
      r: GRID_TILTS[i % GRID_TILTS.length],
    };
  });
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const num = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** A photo kept on the slate: its size in range, its middle inside. */
function fitSticker(s: LuSticker): LuSticker {
  const w = Math.round(clamp(s.w, STICKER_W.min, STICKER_W.max));
  const h = w * 1.25;
  return {
    c: s.c,
    x: Math.round(clamp(s.x, w / 2, SLATE.w - w / 2)),
    y: Math.round(clamp(s.y, h / 2, SLATE.h - h / 2)),
    w,
    r: Math.round(clamp(s.r, -TILT_MAX, TILT_MAX)),
  };
}

/**
 * A board as it may be kept: only the owner's cards, each once, inside the
 * slate; words trimmed to the limits. Null when it isn't a board at all.
 */
export function cleanBoard(raw: unknown, hand: number[]): LuBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (!Array.isArray(b.stickers) || !Array.isArray(b.texts)) return null;
  if (typeof b.name !== "string") return null;
  const seen = new Set<number>();
  const stickers: LuSticker[] = [];
  for (const s of b.stickers as Record<string, unknown>[]) {
    if (!s || typeof s !== "object") return null;
    const { c, x, y, w, r } = s;
    if (!Number.isInteger(c) || !num(x) || !num(y) || !num(w) || !num(r))
      return null;
    if (!hand.includes(c as number) || seen.has(c as number)) continue;
    seen.add(c as number);
    stickers.push(fitSticker({ c: c as number, x, y, w, r }));
  }
  const texts: LuText[] = [];
  for (const t of (b.texts as Record<string, unknown>[]).slice(0, MAX_TEXTS)) {
    if (!t || typeof t !== "object") return null;
    const { x, y, s, r } = t;
    if (typeof t.t !== "string" || !num(x) || !num(y) || !num(s) || !num(r))
      return null;
    const words = t.t
      .split("\n")
      .slice(0, MAX_TEXT_LINES)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .join("\n")
      .trim()
      .slice(0, MAX_TEXT);
    if (!words) continue;
    texts.push({
      t: words,
      x: Math.round(clamp(x, 0, SLATE.w)),
      y: Math.round(clamp(y, 0, SLATE.h)),
      s: Math.round(clamp(s, TEXT_SIZE.min, TEXT_SIZE.max)),
      r: Math.round(clamp(r, -TILT_MAX, TILT_MAX)),
    });
  }
  return {
    name: b.name.replace(/\s+/g, " ").trim().slice(0, MAX_TEAM_NAME),
    stickers,
    texts,
  };
}

/**
 * The board as it shows: the owner's layout, with any card they hold but
 * never placed (a trade, a leftover) in the grid's spot for it.
 */
export function boardOf(board: LuBoard | undefined, hand: number[]): LuBoard {
  const grid = gridSpots(hand.length);
  const placed = new Map((board?.stickers ?? []).map((s) => [s.c, s]));
  return {
    name: board?.name ?? "",
    stickers: hand.map((c, i) => placed.get(c) ?? { c, ...grid[i] }),
    texts: board?.texts ?? [],
  };
}
