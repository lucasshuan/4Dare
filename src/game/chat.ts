// Room chat, shared by the server and the screens: what players write and the
// system lines a match posts ("▶ Match started", "🦸 Theme: Superheroes",
// "Order: …", "Match 1 · Bia's turn"). Messages live outside RoomState (every
// room write is a compare-and-swap, so chat would race the game); a system
// line is stored as data and written in each viewer's language.
import {
  type Beat,
  type Identity,
  type PlayerId,
  type Reveal,
  type RoomState,
  SHOW_MARKS,
  type ShowKind,
  type Theme,
} from "./types";

/** Longest message, in code points ([...text].length), like Postgres char_length. */
export const MAX_CHAT = 280;
/** What a newcomer reads on entering: the last 50 lines, like any group chat. */
export const CHAT_PAGE = 50;
/** Refetches ask from the newest line's time minus this, and merge by id: ids can commit out of order. */
export const CHAT_OVERLAP_MS = 3000;
/** Per author and room; the same numbers in the route's first line, the local store and add_room_message. */
export const CHAT_LIMITS = [
  { max: 5, windowMs: 10_000 },
  { max: 30, windowMs: 60_000 },
] as const;

/** Who wrote a line or is named in one, as the room showed them then (they may have left since). */
export type ChatPerson = Pick<
  Identity,
  "id" | "isGuest" | "name" | "guestNumber" | "avatar"
>;

/** A system line: only the prototype's four. */
export type SystemLine =
  /** "▶ Match started" */
  | { type: "started" }
  /** "{emoji} Theme: {theme}" (✍️ for a typed theme) */
  | { type: "theme"; theme: Theme }
  /** "Order: [av]Bia, [av]Rafa, [av]you, [av]Leo" */
  | { type: "order"; players: ChatPerson[] }
  /** "Match {n} · [av]Bia's turn" */
  | { type: "firstTurn"; n: number; player: ChatPerson };

export interface ChatMessage {
  /** Identity id; per-room order is (max(at, showAt), id). */
  id: number;
  /** Created, server ms. */
  at: number;
  /** Server ms from which it may show: a system line waits for its scene. */
  showAt: number;
  /** null = system line. */
  by: PlayerId | null;
  /** Snapshot of the writer; the UI prefers the live player with the same id. */
  author: ChatPerson | null;
  text: string | null;
  system: SystemLine | null;
}

/** A line to save: a player's text, or a system line. */
export type NewChatMessage =
  | { by: PlayerId; author: ChatPerson; text: string; showAt?: number }
  | { system: SystemLine; showAt?: number };

export const chatPerson = (p: ChatPerson): ChatPerson => ({
  id: p.id,
  isGuest: p.isGuest,
  name: p.name,
  guestNumber: p.guestNumber,
  avatar: p.avatar,
});

/**
 * A message as it is kept: trimmed, control characters gone (a tab becomes a
 * space, line breaks stay), three or more line breaks squashed to one blank
 * line. Null when nothing is left or it is longer than MAX_CHAT.
 */
export function cleanChatText(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > MAX_CHAT * 8) return null;
  const kept = [...raw.replace(/\r\n?/g, "\n").replace(/\t/g, " ")]
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c === 10 || !(c < 32 || (c >= 127 && c < 160));
    })
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const length = [...kept].length;
  return length >= 1 && length <= MAX_CHAT ? kept : null;
}

/** The show of `kind` on screen or queued: the reveal itself, or the one still playing under it. */
function show(reveal: Reveal | null, kind: ShowKind): Reveal | null {
  if (reveal?.kind === kind) return reveal;
  if (reveal?.prev?.kind === kind) return reveal.prev;
  return null;
}

const beatOf = (s: Reveal | null, kind: Beat["kind"]) =>
  s?.beats?.find((b) => b.kind === kind) ?? null;

/** A moment inside a beat, scaled like the beats and kept inside it. */
const at = (beat: Beat, ms: number, scale: number) =>
  beat.startsAt +
  Math.min(Math.round(ms * scale), Math.max(0, beat.until - beat.startsAt));

/**
 * The system lines a successful write posts, each once: the compare-and-swap
 * lets one writer see each transition. `showAt` is when its scene shows it.
 * Comparing states, not events, means SWAP_PLAYER, UPDATE_IDENTITY, DRAFT,
 * GONE/BACK and the like post nothing.
 */
export function systemLines(
  before: RoomState,
  after: RoomState,
  now: number,
  showScale = 1,
): NewChatMessage[] {
  const scale = showScale > 0 ? showScale : 1;
  const lines: NewChatMessage[] = [];
  if (
    before.phase === "lobby" &&
    (after.phase === "voting" || after.phase === "theming")
  ) {
    lines.push({
      system: { type: "started" },
      showAt: show(after.reveal, "opening")?.startsAt ?? now,
    });
  }
  if (after.round > before.round && after.theme) {
    const theme = show(after.reveal, "theme");
    const beat = beatOf(theme, "theme");
    lines.push({
      system: { type: "theme", theme: after.theme },
      showAt: beat
        ? at(beat, SHOW_MARKS.themeLine, scale)
        : (theme?.startsAt ?? now),
    });
  }
  if (before.playStartedAt == null && after.playStartedAt != null) {
    const cast = show(after.reveal, "cast");
    const beat = beatOf(cast, "order");
    const v = cast?.first ? "first" : "later";
    const byId = new Map(after.players.map((p) => [p.id, p]));
    const players = after.order.flatMap((id) => {
      const p = byId.get(id);
      return p && !p.away ? [chatPerson(p)] : [];
    });
    lines.push({
      system: { type: "order", players },
      showAt: beat ? at(beat, SHOW_MARKS.orderLine[v], scale) : now,
    });
    const first = after.turnPlayerId ? byId.get(after.turnPlayerId) : null;
    if (first)
      lines.push({
        system: {
          type: "firstTurn",
          n: after.round,
          player: chatPerson(first),
        },
        showAt: (cast?.until ?? after.playStartedAt) + SHOW_MARKS.turnLine,
      });
  }
  return lines;
}

/** Where a line sits in the chat: when it shows (a scene's line lands at the bottom then), then its id. */
export const chatOrder = (a: ChatMessage, b: ChatMessage) =>
  Math.max(a.at, a.showAt) - Math.max(b.at, b.showAt) || a.id - b.id;

/** The lines that may show at server time `now`, in chat order. */
export function visibleChat<T extends ChatMessage>(
  messages: Iterable<T>,
  now: number,
): T[] {
  return [...messages].filter((m) => shown(m, now)).sort(chatOrder);
}

/**
 * Only a system line waits for its scene. A player's line shows at once: its
 * `showAt` is the database's clock, which a browser's estimate can trail.
 */
export function shown(m: ChatMessage, now: number): boolean {
  return m.system === null || m.showAt <= now;
}

/** Unread: visible players' lines newer than `seen` that someone else wrote. System lines never count. */
export function countUnread(
  messages: Iterable<ChatMessage>,
  seen: number,
  you: PlayerId,
  now: number,
): number {
  let n = 0;
  for (const m of messages)
    if (m.text !== null && m.by !== you && m.id > seen && shown(m, now)) n++;
  return n;
}

const swap = (p: ChatPerson, from: PlayerId, to: PlayerId): ChatPerson =>
  p.id === from ? { ...p, id: to } : p;

/** A guest signed in: their lines and the system lines naming them become the account's. */
export function reassignMessage(
  m: ChatMessage,
  from: PlayerId,
  to: PlayerId,
): ChatMessage {
  const s = m.system;
  return {
    ...m,
    by: m.by === from ? to : m.by,
    author: m.author ? swap(m.author, from, to) : null,
    system:
      s?.type === "order"
        ? { ...s, players: s.players.map((p) => swap(p, from, to)) }
        : s?.type === "firstTurn"
          ? { ...s, player: swap(s.player, from, to) }
          : s,
  };
}
