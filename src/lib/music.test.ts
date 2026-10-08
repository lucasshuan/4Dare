import { describe, expect, it } from "vitest";
import { loopPosition, musicVolume } from "./music";
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
