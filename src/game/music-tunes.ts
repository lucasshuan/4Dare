// The music's settings the panel can change (tune.ts), apart from the player
// (src/lib/music.ts) so the server can check them too: each take's level and
// loop, and which take plays at each moment of each game.
import type { GameKey } from "./games";
import { tunable } from "./tune";

/**
 * The shared tune's tempo: every take but the Encore plays it, and the title
 * and end scenes move to it. One number, so the scenes and the music never
 * drift apart.
 */
export const MUSIC_BPM = 95.076;
/** One beat of the shared tune (seconds). */
export const MUSIC_BEAT = 60 / MUSIC_BPM;

/** The takes there are, in the panel's order. */
export const TRACK_IDS = [
  "stage",
  "booth",
  "impostor",
  "precinct",
  "bidding",
  "matchday",
  "recess",
  "encore",
] as const;
export type TrackId = (typeof TRACK_IDS)[number];

/**
 * Each take's level (dB over its file: the player's volume stays apart) and
 * its loop, in bars of its own grid: back to bar `start` after bar `end` − 1.
 */
export const TRACK_TUNES = tunable<
  Record<TrackId, { gainDb: number; start: number; end: number }>
>("music", {
  stage: { gainDb: 0, start: 0, end: 49 },
  booth: { gainDb: 0, start: 8, end: 48 },
  impostor: { gainDb: 0, start: 0, end: 49 },
  precinct: { gainDb: 0, start: 24, end: 50 },
  bidding: { gainDb: 0, start: 0, end: 49 },
  matchday: { gainDb: 0, start: 8, end: 49 },
  recess: { gainDb: 0, start: 8, end: 48 },
  encore: { gainDb: 0, start: 8, end: 56 },
});

/** The moments a game's music changes at; `host` is What for?'s presenter, in the booth. */
export const MOMENTS = ["room", "opening", "host", "end"] as const;
export type Moment = (typeof MOMENTS)[number];

/** What plays at each moment ("" is silence: the moment before it goes on). */
export const MOMENT_TRACKS = tunable<
  Record<GameKey, Partial<Record<Moment, TrackId | "">>>
>("moments", {
  "who-am-i": { room: "stage", opening: "stage", end: "" },
  impostor: { room: "impostor", opening: "impostor", end: "" },
  lineup: { room: "matchday", opening: "matchday", host: "booth", end: "" },
});

/** The take for a moment of a game; null for silence or a moment the game doesn't have. */
export function trackFor(game: GameKey, moment: Moment): TrackId | null {
  const t = MOMENT_TRACKS[game][moment];
  return t && (TRACK_IDS as readonly string[]).includes(t)
    ? (t as TrackId)
    : null;
}
