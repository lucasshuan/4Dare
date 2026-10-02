// What we keep of a finished match, per player: who picked what for whom,
// how it ended and how long it took. Not shown anywhere yet.
import { themeId } from "./theme-id";
import type { Lang, Localized, PlayerId, RoomState } from "./types";

export type PlayerResult = "discovered" | "gave_up" | "left" | "not_found";

export interface PlayerRecord {
  userId: PlayerId;
  /** Played as a guest; the record follows the user if they create an account. */
  wasGuest: boolean;
  lang: Lang;
  pickedById: PlayerId | null;
  characterId: string | null;
  characterName: string | null;
  characterOrigin: string | null;
  /** The clock picked the character, not a person: left out of what players pick for a theme. */
  autoPicked: boolean;
  result: PlayerResult;
  /** 1 = first to discover. */
  place: number | null;
  /** Number of the jogada that discovered the character. */
  discoveredAt: number | null;
  questions: number;
  guesses: number;
  /** From the first question of the match to discovering, giving up or leaving. */
  timeMs: number | null;
}

export interface MatchRecord {
  /** Room code + start time: saving the same match twice is a no-op. */
  id: string;
  roomCode: string;
  round: number;
  theme: Localized | null;
  /** themeId(theme): groups what players picked for the same theme. */
  themeId: string | null;
  startedAt: number;
  finishedAt: number;
  players: PlayerRecord[];
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
      return {
        userId: p.id,
        wasGuest: p.isGuest,
        lang: p.lang,
        pickedById: a.pickerId,
        characterId: a.character?.id ?? null,
        characterName: a.character?.name ?? null,
        characterOrigin: a.character?.origin ?? null,
        autoPicked: !!a.auto,
        result,
        place: o?.place ?? null,
        discoveredAt: o?.discoveredAt ?? null,
        questions: mine.filter((play) => play.kind === "question").length,
        guesses: mine.filter((play) => play.kind === "guess").length,
        timeMs: o?.endedAt != null ? Math.max(0, o.endedAt - startedAt) : null,
      };
    });
  return {
    id: `${s.code}-${startedAt}`,
    roomCode: s.code,
    round: s.round,
    theme: s.theme,
    themeId: s.theme ? themeId(s.theme) : null,
    startedAt,
    finishedAt: now,
    players,
  };
}
