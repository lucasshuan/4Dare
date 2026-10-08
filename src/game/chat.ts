// Room chat, shared by the server and the screens: what players write and the
// system lines a match posts ("▶ Match started", "🦸 Theme: Superheroes",
// "Order: …", "Match 1 · Bia's turn"). Messages live outside RoomState (every
// room write is a compare-and-swap, so chat would race the game); a system
// line is stored as data and written in each viewer's language.
import {
  type Beat,
  type Identity,
  type Localized,
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

/** Someone in a line as the browser gets them: the name ready, in the reader's language. */
export type ShownPerson = Pick<Identity, "id" | "isGuest" | "avatar"> & {
  name: string;
};

/** A system line: only the prototype's four. Kept with ChatPerson, read with ShownPerson. */
export type SystemLine<P = ChatPerson> =
  /** "▶ Match started" */
  | { type: "started" }
  /** "{emoji} Theme: {theme}" (✍️ for a typed theme) */
  | { type: "theme"; theme: Theme }
  /** "Order: [av]Bia, [av]Rafa, [av]you, [av]Leo" */
  | { type: "order"; players: P[] }
  /** "Match {n} · [av]Bia's turn" */
  | { type: "firstTurn"; n: number; player: P }
  /** What for?: "🔨 Hulk to [av]Bia for 3" */
  | { type: "sold"; card: string; player: P; price: number }
  /** What for?: "Nobody wanted A pigeon: it goes to the leftovers" */
  | { type: "leftover"; card: string }
  /** What for?: "[av]Rafa gets A pigeon from the leftovers" */
  | { type: "freebie"; card: string; player: P }
  /** What for?: "⇄ [av]Rafa gave Black Panther to [av]Leo for A baby, A clown" */
  | { type: "trade"; from: P; to: P; gave: string[]; got: string[] }
  /** What for?: "✉️ What for? Change a tire, in the rain." */
  | { type: "mission"; text: Localized }
  /** What for?: "🏆 Round 1: [av]Bia" (or several, tied) */
  | { type: "roundWon"; n: number; players: P[] }
  /** What for?: "📺 [av]Bia presents" (or "The draw picked [av]Bia") */
  | { type: "presenter"; player: P; drawn: boolean }
  /** What for?: "📺 [av]Caio left. The room votes." */
  | { type: "hostLeft"; player: P }
  /** What for?: "📺 [av]Caio: "They'd fix it in the rain"" (or that they didn't explain) */
  | { type: "verdict"; player: P; why: string };

/** A line as it is kept (ChatPerson) or as the browser gets it (ShownPerson, see ShownLine). */
export interface ChatMessage<P = ChatPerson> {
  /** Identity id; per-room order is (max(at, showAt), id). */
  id: number;
  /** Created, server ms. */
  at: number;
  /** Server ms from which it may show: a system line waits for its scene. */
  showAt: number;
  /** null = system line. */
  by: PlayerId | null;
  /** Snapshot of the writer; the UI prefers the live player with the same id. */
  author: P | null;
  text: string | null;
  system: SystemLine<P> | null;
}

/** A line as the browser gets it: names ready. */
export type ShownLine = ChatMessage<ShownPerson>;

/** Either kind: what ordering and counting lines need. */
type AnyLine = ChatMessage<ChatPerson | ShownPerson>;

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
    (after.phase === "voting" ||
      after.phase === "theming" ||
      after.phase === "bidding")
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
  lines.push(...lineupLines(before, after, now, scale));
  return lines;
}

/** What for?'s lines: each hammer, the leftovers, the trades, the mission, the winners. */
function lineupLines(
  before: RoomState,
  after: RoomState,
  now: number,
  scale: number,
): NewChatMessage[] {
  const a = after.lu;
  const b = before.lu;
  if (!a) return [];
  const lines: NewChatMessage[] = [];
  const round = a.rounds.at(-1);
  const deck = a.decks[a.round - 1];
  if (!round || !deck) return lines;
  const same = b?.round === a.round ? b.rounds.at(-1) : undefined;
  const person = (id: PlayerId | null) => {
    const p = id ? after.players.find((x) => x.id === id) : undefined;
    return p ? chatPerson(p) : null;
  };
  const name = (c: number) => deck.cards[c]?.name ?? "";
  // the presenter: who sits in the chair, and whether they walk out
  const host = person(a.presenter);
  if (host && before.phase === "lobby" && after.phase !== "lobby")
    lines.push({
      system: { type: "presenter", player: host, drawn: !!a.drawn },
      showAt: beatOf(show(after.reveal, "opening"), "chair")?.startsAt ?? now,
    });
  const away = (s: RoomState) =>
    !s.players.some((p) => p.id === a.presenter && !p.away);
  if (host && b?.presenter && !away(before) && away(after))
    lines.push({ system: { type: "hostLeft", player: host }, showAt: now });
  const sold = show(after.reveal, "sold");
  const soldAt = sold ? sold.startsAt + Math.round(600 * scale) : now;
  for (const [key, tag] of Object.entries(round.tags)) {
    const c = Number(key);
    if (same?.tags[c]) continue;
    if (tag.by && tag.price > 0) {
      const p = person(tag.by);
      if (p)
        lines.push({
          system: { type: "sold", card: name(c), player: p, price: tag.price },
          showAt: soldAt,
        });
    } else {
      const owner = Object.entries(round.hands).find(([, h]) => h.includes(c));
      const p = person(owner?.[0] ?? null);
      if (p)
        lines.push({
          system: { type: "freebie", card: name(c), player: p },
          showAt: show(after.reveal, "wrap")?.startsAt ?? now,
        });
    }
  }
  for (const c of round.leftovers.slice(same?.leftovers.length ?? 0))
    if (!Object.values(round.hands).some((h) => h.includes(c)))
      lines.push({
        system: { type: "leftover", card: name(c) },
        showAt: soldAt,
      });
  for (const tr of round.trades.slice(same?.trades.length ?? 0)) {
    const from = person(tr.from);
    const to = person(tr.to);
    if (from && to)
      lines.push({
        system: {
          type: "trade",
          from,
          to,
          gave: tr.give.map(name),
          got: tr.get.map(name),
        },
        showAt: now,
      });
  }
  if (after.phase === "defending" && before.phase !== "defending") {
    const env = show(after.reveal, "envelope");
    const beat = beatOf(env, "envelope");
    lines.push({
      system: { type: "mission", text: deck.mission.text },
      showAt: beat ? at(beat, SHOW_MARKS.missionTag, scale) : now,
    });
  }
  if (
    after.phase === "scoring" &&
    before.phase !== "scoring" &&
    round.winners.length
  ) {
    const tally = show(after.reveal, "tally");
    const verdict = round.verdict?.final ? round.verdict : null;
    const call = beatOf(tally, "verdict");
    const by = verdict ? person(verdict.by) : null;
    if (verdict && by)
      lines.push({
        system: { type: "verdict", player: by, why: verdict.why },
        showAt: call?.startsAt ?? now,
      });
    const stamp = beatOf(tally, "stamp") ?? call;
    lines.push({
      system: {
        type: "roundWon",
        n: round.n,
        players: round.winners.flatMap((id) => person(id) ?? []),
      },
      showAt: stamp?.startsAt ?? now,
    });
  }
  return lines;
}

/** Where a line sits in the chat: when it shows (a scene's line lands at the bottom then), then its id. */
export const chatOrder = (a: AnyLine, b: AnyLine) =>
  Math.max(a.at, a.showAt) - Math.max(b.at, b.showAt) || a.id - b.id;

/** The lines that may show at server time `now`, in chat order. */
export function visibleChat<T extends AnyLine>(
  messages: Iterable<T>,
  now: number,
): T[] {
  return [...messages].filter((m) => shown(m, now)).sort(chatOrder);
}

/**
 * Only a system line waits for its scene. A player's line shows at once: its
 * `showAt` is the database's clock, which a browser's estimate can trail.
 */
export function shown(m: AnyLine, now: number): boolean {
  return m.system === null || m.showAt <= now;
}

/** Unread: visible players' lines newer than `seen` that someone else wrote. System lines never count. */
export function countUnread(
  messages: Iterable<AnyLine>,
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
