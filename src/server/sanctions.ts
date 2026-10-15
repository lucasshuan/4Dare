import "server-only";
import { GameError } from "@/game/types";
import { getBackend } from "./backend";
import type { Sanction } from "./backend/people-types";

/**
 * What the panel decided about a person, as the site applies it. A ban keeps
 * them out of rooms and from writing, voting, suggesting and sending; a mute
 * keeps them out of the chat and the murals (they play as usual). A warning
 * is a message they see once when they come in. Read per person, kept a few
 * seconds per server instance.
 */

const TTL = 15_000;
const cache = new Map<string, { at: number; list: Sanction[] }>();

async function sanctionsOf(person: string): Promise<Sanction[]> {
  const hit = cache.get(person);
  if (hit && Date.now() - hit.at < TTL) return hit.list;
  const list = await getBackend()
    .people.sanctions(person)
    .catch((e: unknown) => {
      // a check that can't be read lets the person through
      console.error("[sanctions] read failed:", e);
      return [] as Sanction[];
    });
  cache.set(person, { at: Date.now(), list });
  return list;
}

/** A panel's change to someone: read it again on their next action here. */
export const forgetSanctions = (person: string) => cache.delete(person);

const live = (s: Sanction, now: number) =>
  !s.liftedAt && (s.until === null || s.until > now);

/** The ban, the mute and the unread warning in force among `list`. */
export function standingOf(list: readonly Sanction[], now = Date.now()) {
  return {
    ban: list.find((s) => s.kind === "ban" && live(s, now)) ?? null,
    mute: list.find((s) => s.kind === "mute" && live(s, now)) ?? null,
    warn: list.find((s) => s.kind === "warn" && !s.seenAt) ?? null,
  };
}

/** Throws when the person may not: "play" (enter rooms), "write" (chat, murals) or "contribute" (votes, suggestions, pictures, nicknames). */
export async function guard(
  person: string,
  what: "play" | "write" | "contribute",
) {
  const s = standingOf(await sanctionsOf(person));
  if (s.ban) throw new GameError("suspended");
  if (what === "write" && s.mute) throw new GameError("silenced");
}

/** What the person is told when they come in: a ban, a mute or a warning. */
export interface SanctionNotice {
  id: number;
  kind: "warn" | "mute" | "ban";
  reason: string | null;
  until: number | null;
}

export async function noticeFor(
  person: string,
): Promise<SanctionNotice | null> {
  const s = standingOf(await sanctionsOf(person));
  const top = s.ban ?? s.mute ?? s.warn;
  if (!top || top.kind === "none") return null;
  return { id: top.id, kind: top.kind, reason: top.reason, until: top.until };
}

/** The person read their warning. */
export async function readNotice(person: string, id: number) {
  const list = await sanctionsOf(person);
  if (!list.some((s) => s.id === id && s.kind === "warn")) return;
  await getBackend().people.seeSanction(id);
  forgetSanctions(person);
}
