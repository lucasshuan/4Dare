// The chat tab's rules that need no React: sizes, timings, what counts as
// unread, which faces show, when a message is only emoji, and where the last
// read line is remembered.
import type { ShownLine } from "@/game/chat";
import type { PlayerId } from "@/game/types";

/** Folded height of the tab (desktop) and the bar (phone, plus the safe area). */
export const SHUT = { desktop: 56, phone: 60 } as const;
/** Open height, as a share of the window's height. */
export const OPEN_SHARE = { desktop: 0.62, phone: 0.66 } as const;
/** How long a desktop bubble stays above the folded tab (ms). */
export const BUBBLE_MS = 3050;
/** The tab's hop on each unread message: y keyframes, 0.6 s. */
export const HOP = [0, -14, 0, -5, 0];
/**
 * When each hop keyframe is reached: evenly spaced keyframes played on a
 * power1.out timeline (GSAP's default), so progress k/4 lands at
 * t = 1 − √(1 − k/4).
 */
export const HOP_TIMES = [0, 0.134, 0.293, 0.5, 1];
/** Live-region announcements of new messages, at most one per this many ms. */
export const ANNOUNCE_MS = 3000;
/** Faces of unread senders on the desktop tab. */
export const MAX_FACES = 3;

/** The unread count as the 24 px pill shows it. */
export const countLabel = (n: number) => (n > 99 ? "99+" : String(n));

/** The newest saved line's id (yours on their way have negative ids), 0 when none. */
export function newestId(messages: Iterable<ShownLine>): number {
  let id = 0;
  for (const m of messages) if (m.id > id) id = m.id;
  return id;
}

/** A line that counts as unread: someone else's text, newer than `seen`. */
export const isUnread = (m: ShownLine, seen: number, you: PlayerId) =>
  m.text !== null && m.by !== null && m.by !== you && m.id > seen;

/**
 * The latest unread line of each of the last `MAX_FACES` distinct senders,
 * newest first: their faces on the tab. `messages` are in chat order.
 */
export function unreadSenders(
  messages: readonly ShownLine[],
  seen: number,
  you: PlayerId,
): ShownLine[] {
  const out: ShownLine[] = [];
  for (let i = messages.length - 1; i >= 0 && out.length < MAX_FACES; i--) {
    const m = messages[i];
    if (isUnread(m, seen, you) && !out.some((o) => o.by === m.by)) out.push(m);
  }
  return out;
}

/** The last player's line (yours included): the phone bar shows it. */
export function lastTextLine(messages: readonly ShownLine[]): ShownLine | null {
  for (let i = messages.length - 1; i >= 0; i--)
    if (messages[i].text !== null) return messages[i];
  return null;
}

const EMOJI_PART =
  /^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[‍️⃣])$/u;
const PICTURE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** A message made only of emoji ("😂", "👍🏽🎉"): drawn big, without a bubble. */
export function isEmojiOnly(text: string): boolean {
  const chars = [...text.replace(/\s+/g, "")];
  return (
    chars.length > 0 &&
    chars.length <= 24 &&
    PICTURE.test(text) &&
    chars.every((c) => EMOJI_PART.test(c))
  );
}

/** The last line this browser has read in a room, kept across reloads. */
export const seenKey = (code: string) => `4dare:chat-seen:${code}`;

export function readSeen(code: string): number | null {
  try {
    const v = window.localStorage.getItem(seenKey(code));
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeSeen(code: string, id: number) {
  try {
    window.localStorage.setItem(seenKey(code), String(id));
  } catch {
    // private window or blocked storage: unread counts start over on reload
  }
}
