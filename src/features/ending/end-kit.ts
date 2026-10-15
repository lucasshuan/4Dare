// What the three end scenes share: their beat, when the reward card comes in
// and turns into the pill, and the props every scene is drawn from.

import type { Bleed } from "@/features/opening/title-kit";
import type { GameKey } from "@/game/games";
import { MUSIC_BEAT } from "@/game/music-tunes";

/**
 * The end has no music of its own yet: every scene falls on the beats of the
 * game's take (the shared tune, MUSIC_BPM), so the end's track can be written to the same tempo.
 */
export const END_BEAT = MUSIC_BEAT;

/** When the scene's acts change, in seconds from its start. */
export interface EndActs {
  /** The reward card comes in from the left (the climax made room for it). */
  card: number;
  /** The card turns into the pill, and the room's panels come in above it. */
  pill: number;
}

/** Every scene's beats start at its own first beat: the Impostor's first light, Who am I?'s stage, the newspaper's push. */
const firstBeat = (at: number, card: number, pill: number): EndActs => ({
  card: at + card * END_BEAT,
  pill: at + pill * END_BEAT,
});

export const END_ACTS: Record<GameKey, EndActs> = {
  impostor: firstBeat(0.85, 12, 20),
  "who-am-i": firstBeat(3, 8, 16),
  lineup: firstBeat(0.35, 6, 14),
};

/** What every end scene is drawn from, besides its game's own data. */
export interface EndProps {
  /** Drawn for a phone held upright (780×1688) instead of a landscape screen (1280×720). */
  portrait: boolean;
  /** The window past the canvas on each side, in canvas pixels. */
  bleed: Bleed;
}
