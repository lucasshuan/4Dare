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
});

describe("musicVolume", () => {
  it("starts at half the overall volume", () => {
    expect(DEFAULT_SETTINGS.sounds.music).toEqual({ on: true, volume: 0.5 });
    expect(musicVolume(DEFAULT_SETTINGS)).toBeCloseTo(0.5 * 0.8);
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
  it("keeps 192 beats to the loop, so the beat survives each wrap", () => {
    expect((129.2721 - 8.1062) / MUSIC_BEAT).toBeCloseTo(192, 1);
  });
});
