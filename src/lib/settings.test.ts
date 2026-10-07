import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";
import { soundVolume } from "./sound";

describe("parseSettings", () => {
  it("gives the defaults for nothing or junk", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("loud")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ volume: "max", sounds: [] })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("keeps what was saved and clamps volumes", () => {
    const s = parseSettings({
      volume: 1.4,
      muted: true,
      sounds: { clock: { on: false, volume: -2 } },
      chatBubbles: false,
      games: { "who-am-i": { confirmPass: true }, "old-game": { x: true } },
    });
    expect(s.volume).toBe(1);
    expect(s.muted).toBe(true);
    expect(s.sounds.clock).toEqual({ on: false, volume: 0 });
    expect(s.sounds.chat).toEqual(DEFAULT_SETTINGS.sounds.chat);
    expect(s.chatBubbles).toBe(false);
    expect(s.games).toEqual({
      "who-am-i": { confirmPass: true, popularHand: true },
    });
  });
});

describe("soundVolume", () => {
  it("multiplies the sound's level by its group's and the overall one", () => {
    const s = parseSettings({
      volume: 0.5,
      sounds: { match: { on: true, volume: 0.5 } },
    });
    expect(soundVolume("step", s)).toBeCloseTo(0.6 * 0.5 * 0.5);
  });

  it("is silent when muted or when the group is off", () => {
    expect(soundVolume("chat", parseSettings({ muted: true }))).toBe(0);
    const off = parseSettings({ sounds: { room: { on: false } } });
    expect(soundVolume("join", off)).toBe(0);
    expect(soundVolume("chat", off)).toBeGreaterThan(0);
  });
});
