// What for?'s hand-made banks as the server reads them (lineup_missions,
// lineup_extras), and how a match draws from them. Pure: the server passes
// the bank, the room and the dice.
import type { Lang, Localized } from "../types";
import type { LuCard, LuMission } from "./types";

/** The tones the Missions tab groups the missions by. */
export const TONES = [
  "chores",
  "social",
  "adventure",
  "absurd",
  "contest",
] as const;
export type Tone = (typeof TONES)[number];

export interface BankMission {
  id: string;
  tone: Tone;
  /** Shipwrecks, funerals: a room can switch these off. */
  heavy: boolean;
  text: Localized;
}

export interface BankExtra {
  id: string;
  emoji: string;
  tint: string;
  name: Localized;
}

/** A room's next matches skip the missions it played this recently. */
export const RECENT_MISSIONS = 30;
/** The obvious contest (a fight, a race) comes up about one round in five. */
const CONTEST_SHARE = 0.2;

/** The missions a room can draw: on, heavy ones only if the room allows. */
export function roomMissions(
  bank: readonly BankMission[],
  o: { heavy: boolean; off: readonly string[] },
): BankMission[] {
  const off = new Set(o.off);
  return bank.filter((m) => !off.has(m.id) && (o.heavy || !m.heavy));
}

/**
 * One mission per round, none twice and none the room played lately (unless
 * that leaves too few). The contests weigh CONTEST_SHARE of the draw.
 */
export function pickMissions(
  bank: readonly BankMission[],
  o: {
    heavy: boolean;
    off: readonly string[];
    recent: readonly string[];
    rounds: number;
  },
  random: () => number,
): LuMission[] {
  const on = roomMissions(bank, o);
  // a room that switched almost everything off still gets its rounds
  const pool =
    on.length >= o.rounds ? on : roomMissions(bank, { ...o, off: [] });
  const recent = new Set(o.recent);
  const fresh = pool.filter((m) => !recent.has(m.id));
  let left = fresh.length >= o.rounds ? fresh : pool;
  const picked: LuMission[] = [];
  for (let r = 0; r < o.rounds && left.length; r++) {
    const contests = left.filter((m) => m.tone === "contest").length;
    const others = left.length - contests;
    const weight = (m: BankMission) =>
      m.tone === "contest"
        ? others
          ? CONTEST_SHARE / contests
          : 1
        : contests
          ? (1 - CONTEST_SHARE) / others
          : 1;
    let roll = random() * left.reduce((a, m) => a + weight(m), 0);
    let chosen = left[left.length - 1];
    for (const m of left) {
      roll -= weight(m);
      if (roll < 0) {
        chosen = m;
        break;
      }
    }
    picked.push({ id: chosen.id, text: { ...chosen.text } });
    left = left.filter((m) => m !== chosen);
  }
  return picked;
}

/** An extra as a card on the table, in the room's language. */
export const extraCard = (x: BankExtra, lang: Lang): LuCard => ({
  id: `x:${x.id}`,
  name: x.name[lang],
  origin: null,
  imageUrl: null,
  emoji: x.emoji,
  tint: x.tint,
});
