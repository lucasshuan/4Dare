import { describe, expect, it } from "vitest";
import {
  applyPreset,
  defaultPreset,
  matchesPreset,
  PRESETS_MAX,
  type PresetSetup,
  parsePresets,
  presetSetup,
} from "./presets";
import { DEFAULT_SETTINGS } from "./types";

const setup: PresetSetup = presetSetup(DEFAULT_SETTINGS);
const preset = (id: string, extra: object = {}) => ({
  id,
  name: `Preset ${id}`,
  game: "who-am-i",
  setup: {
    ...setup,
    askSeconds: 90,
    offTastes: ["real"],
    offThemes: ["b", "a"],
  },
  isDefault: false,
  ...extra,
});

describe("presets", () => {
  it("reads back only sound presets, at most one default per game", () => {
    const read = parsePresets([
      preset("one", { isDefault: true }),
      preset("two", { isDefault: true }),
      preset("one"),
      { ...preset("bad"), game: "chess" },
      { ...preset("bad2"), name: " " },
      { ...preset("bad3"), setup: { ...setup, askSeconds: 5 } },
      {
        ...preset("bad4"),
        setup: {
          ...setup,
          offTastes: [
            "anime",
            "animation",
            "live",
            "games",
            "comics",
            "books",
            "faith",
            "real",
          ],
        },
      },
    ]);
    expect(read.map((p) => [p.id, p.isDefault])).toEqual([
      ["one", true],
      ["two", false],
    ]);
    expect(read[0].setup.offThemes).toEqual(["a", "b"]);
    expect(parsePresets("nope")).toEqual([]);
    expect(
      parsePresets(Array.from({ length: 20 }, (_, i) => preset(`p${i}`))),
    ).toHaveLength(PRESETS_MAX);
  });

  it("applies whole in its game, only tastes and themes in another", () => {
    const [p] = parsePresets([preset("one")]);
    const room = { ...DEFAULT_SETTINGS, game: "who-am-i" as const };
    const same = applyPreset(room, p);
    expect(same.askSeconds).toBe(90);
    expect(same.offTastes).toEqual(["real"]);
    expect(matchesPreset(same, p)).toBe(true);
    expect(matchesPreset({ ...same, voteSeconds: 30 }, p)).toBe(false);
    const other = applyPreset(room, { ...p, game: "impostor" as never });
    expect(other.askSeconds).toBe(DEFAULT_SETTINGS.askSeconds);
    expect(other.offThemes).toEqual(["a", "b"]);
  });

  it("finds the preset new rooms of a game start from", () => {
    const list = parsePresets([
      preset("one"),
      preset("two", { isDefault: true }),
    ]);
    expect(defaultPreset(list, "who-am-i")?.id).toBe("two");
    expect(defaultPreset(parsePresets([preset("one")]), "who-am-i")).toBeNull();
  });
});
