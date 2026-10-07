// What we keep of a finished match, per player: who picked what for whom,
// how it ended, how long it took and the XP it gave. Profiles read it.
import type { GameKey } from "./games";
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
  const players = s.players
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
  };
}
