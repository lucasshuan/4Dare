// What we keep of a finished match, per player: who picked what for whom,
// how it ended, how long it took and the XP it gave. Profiles read it.
import type { GameKey } from "./games";
import {
  type ImpostorPlayerRecord,
  impostorPart,
  impostorXp,
} from "./impostor/record";
import {
  type LineupRoundPart,
  type LineupRoundRecord,
  lineupPlayers as lineupParts,
  lineupRounds,
} from "./lineup/record";
import { GAME_XP, XP } from "./profile/xp";
import { themeId } from "./theme-id";
import type { Lang, PlayerId, RoomState, Theme } from "./types";

export type PlayerResult = "discovered" | "gave_up" | "left" | "not_found";

export interface PlayerRecord {
  userId: PlayerId;
  /** Played as a guest; the record follows the user if they create an account. */
  wasGuest: boolean;
  lang: Lang;
  pickedById: PlayerId | null;
  /** The picker's language: their pick counts most for its players. Null when they left. */
  pickerLang: Lang | null;
  characterId: string | null;
  characterName: string | null;
  characterOrigin: string | null;
  /** The clock picked the character, not a person: left out of what players pick for a theme. */
  autoPicked: boolean;
  /** The hand or the dice offered it to the picker: it counts less for the theme. */
  suggested: boolean;
  result: PlayerResult;
  /** 1 = first to discover. */
  place: number | null;
  /** Number of the jogada that discovered the character. */
  discoveredAt: number | null;
  questions: number;
  guesses: number;
  /** From the first question of the match to discovering, giving up or leaving. */
  timeMs: number | null;
  /** The match's XP, but the day's first match bonus (MatchRecord.dayBonus). */
  xp: number;
  /** An Impostor match: their side and what they did. */
  impostor?: ImpostorPlayerRecord;
  /** A What for? match: their boards, round by round. */
  lineup?: LineupRoundPart[];
  /** "host": presented the match (What for?), no seat nor points. */
  role?: "player" | "host";
}

export interface MatchRecord {
  /** Room code + start time: saving the same match twice is a no-op. */
  id: string;
  game: GameKey;
  roomCode: string;
  round: number;
  theme: Theme | null;
  /** themeId(theme): groups what players picked for the same theme. Null for a theme the host typed. */
  themeId: string | null;
  startedAt: number;
  finishedAt: number;
  /** Added by the store to a player's XP when it is their first match of the day (UTC). */
  dayBonus: number;
  players: PlayerRecord[];
  /** A What for? match: its rounds (mission, lots, trades). */
  lineup?: { rounds: LineupRoundRecord[] };
  /** A What for? match: everyone played, or someone presented. */
  mode?: "classic" | "host";
}

/** What a player's part of a match gives: nothing for leaving. */
export function playerXp(p: Pick<PlayerRecord, "result" | "place">): number {
  if (p.result === "left") return 0;
  return (
    XP.finish +
    (p.place === 1 ? XP.first : 0) +
    (p.result === "discovered" ? GAME_XP["who-am-i"].discovered : 0)
  );
}

/** The record of a match that just finished, or null if it never got to the questions. */
export function matchRecord(s: RoomState, now: number): MatchRecord | null {
  if (s.phase !== "finished" || s.playStartedAt == null) return null;
  const startedAt = s.playStartedAt;
  const players = s.lu
    ? lineupPlayers(s, startedAt, now)
    : s.imp
      ? impostorPlayers(s, startedAt, now)
      : whoAmIPlayers(s, startedAt);
  return {
    id: `${s.code}-${startedAt}`,
    game: s.settings.game,
    roomCode: s.code,
    round: s.round,
    theme: s.theme,
    themeId: s.theme && s.theme.set !== null ? themeId(s.theme) : null,
    startedAt,
    finishedAt: now,
    dayBonus: XP.dayFirst,
    players,
    ...(s.lu
      ? {
          lineup: { rounds: lineupRounds(s.lu) },
          mode: s.lu.presenter ? ("host" as const) : ("classic" as const),
        }
      : {}),
  };
}

/** Everyone dealt in, placed by points; nothing picked, nothing discovered. */
function lineupPlayers(
  s: RoomState,
  startedAt: number,
  now: number,
): PlayerRecord[] {
  return lineupParts(s).flatMap((part): PlayerRecord[] => {
    const p = s.players.find((q) => q.id === part.id);
    if (!p) return [];
    return [
      {
        userId: p.id,
        wasGuest: p.isGuest,
        lang: p.lang,
        pickedById: null,
        pickerLang: null,
        characterId: null,
        characterName: null,
        characterOrigin: null,
        autoPicked: true,
        suggested: false,
        result: part.left ? "left" : "not_found",
        place: part.place,
        discoveredAt: null,
        questions: 0,
        guesses: 0,
        timeMs: Math.max(0, now - startedAt),
        xp: part.xp,
        lineup: part.rounds,
        ...(part.role === "host" ? { role: "host" as const } : {}),
      },
    ];
  });
}

/** Everyone dealt in: the winners share first place; nothing picked, nothing discovered. */
function impostorPlayers(
  s: RoomState,
  startedAt: number,
  now: number,
): PlayerRecord[] {
  const imp = s.imp;
  if (!imp) return [];
  return s.players
    .filter((p) => imp.dealt.includes(p.id))
    .map((p): PlayerRecord => {
      const part = impostorPart(imp, p.id);
      const won =
        imp.winner !== null && part.impostor === (imp.winner === "impostors");
      const card = part.impostor ? imp.impostor : imp.crew;
      return {
        userId: p.id,
        wasGuest: p.isGuest,
        lang: p.lang,
        pickedById: null,
        pickerLang: null,
        characterId: card.id,
        characterName: card.name,
        characterOrigin: card.origin,
        autoPicked: true,
        suggested: false,
        result: part.left ? "left" : "not_found",
        place: won ? 1 : null,
        discoveredAt: null,
        questions: imp.asked.filter((q) => q.answers[p.id] !== undefined)
          .length,
        guesses: part.guess ? 1 : 0,
        timeMs: Math.max(0, now - startedAt),
        xp: impostorXp(imp, p.id),
        impostor: part,
      };
    });
}

function whoAmIPlayers(s: RoomState, startedAt: number): PlayerRecord[] {
  return s.players
    .filter((p) => s.assignments[p.id])
    .map((p): PlayerRecord => {
      const o = s.outcomes[p.id];
      const a = s.assignments[p.id];
      const result: PlayerResult =
        o?.discoveredAt != null
          ? "discovered"
          : o?.gaveUp
            ? p.away
              ? "left"
              : "gave_up"
            : "not_found";
      const mine = s.plays.filter((play) => play.by === p.id);
      const place = o?.place ?? null;
      return {
        userId: p.id,
        wasGuest: p.isGuest,
        lang: p.lang,
        pickedById: a.pickerId,
        pickerLang: s.players.find((q) => q.id === a.pickerId)?.lang ?? null,
        characterId: a.character?.id ?? null,
        characterName: a.character?.name ?? null,
        characterOrigin: a.character?.origin ?? null,
        autoPicked: !!a.auto,
        suggested: !!a.suggested,
        result,
        place,
        discoveredAt: o?.discoveredAt ?? null,
        questions: mine.filter((play) => play.kind === "question").length,
        guesses: mine.filter((play) => play.kind === "guess").length,
        timeMs: o?.endedAt != null ? Math.max(0, o.endedAt - startedAt) : null,
        xp: playerXp({ result, place }),
      };
    });
}
