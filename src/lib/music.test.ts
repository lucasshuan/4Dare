import { describe, expect, it } from "vitest";
import {
  beatDelay,
  loopPosition,
  MUSIC_BEAT,
  MUSIC_FIRST_BEAT,
  musicVolume,
} from "./music";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("loopPosition", () => {
  it("plays the intro once, then wraps inside the loop", () => {
    expect(loopPosition(0)).toBe(0);
    expect(loopPosition(100)).toBe(100);
    // the loop runs from 8.1062 s to 129.2721 s
    expect(loopPosition(129.2721)).toBeCloseTo(8.1062);
    expect(loopPosition(130)).toBeCloseTo(8.1062 + (130 - 129.2721));
    expect(loopPosition(129.2721 + 121.1659 * 2 + 1)).toBeCloseTo(9.1062);
  });
  it("keeps a take's intro as negative positions", () => {
    expect(loopPosition(-12.5)).toBe(-12.5);
  });
});

describe("musicVolume", () => {
  it("starts at half, like the overall volume", () => {
    expect(DEFAULT_SETTINGS.sounds.music).toEqual({ on: true, volume: 0.5 });
    expect(musicVolume(DEFAULT_SETTINGS)).toBeCloseTo(0.5 * 0.5);
  });

  it("is silent when muted or when the music is off", () => {
    expect(musicVolume(parseSettings({ muted: true }))).toBe(0);
    expect(
      musicVolume(parseSettings({ sounds: { music: { on: false } } })),
    ).toBe(0);
  });
});

describe("beatDelay", () => {
  it("lines a beat animation up with the music's first beat", () => {
    // the song started 10 s before the animation does
    expect(beatDelay(1000, 11000)).toBeCloseTo(-10 + MUSIC_FIRST_BEAT);
    // started at the same moment: the first beat is 0.5333 s away
    expect(beatDelay(5000, 5000)).toBeCloseTo(MUSIC_FIRST_BEAT);
  });
  it("runs the animations with an intro, while the song's first beat is still ahead", () => {
    const phrase = 32 * MUSIC_BEAT;
    // position 0 plays in 20 s: the delay steps back a whole phrase, to the same point in the beat
    const delay = beatDelay(21000, 1000);
    expect(delay).toBeCloseTo(20 + MUSIC_FIRST_BEAT - phrase);
    expect(delay).toBeLessThanOrEqual(MUSIC_FIRST_BEAT);
    // further ahead than a phrase
    expect(beatDelay(41000, 1000)).toBeCloseTo(
      40 + MUSIC_FIRST_BEAT - 2 * phrase,
    );
  });
  it("keeps 192 beats to the loop, so the beat survives each wrap", () => {
    expect((129.2721 - 8.1062) / MUSIC_BEAT).toBeCloseTo(192, 1);
  });
});
