import { describe, expect, it } from "vitest";
import { setSiteTunes } from "@/game/tune";
import { clipStarts, codeClips, titleCues, titleMoments } from "./scene-sound";
import { whoTimes } from "./title-timing";

describe("the title scenes' sounds", () => {
  it("plays the code's mix where the scene puts each moment", () => {
    const t = whoTimes(true, 4);
    expect(titleCues("who-am-i", true, 4)).toEqual([
      { src: "/sfx/thump.mp3", at: t.numIn, gain: 1 },
      { src: "/sfx/whoosh.mp3", at: t.numOut, gain: 0.5 },
      ...[0, 1, 2, 3].map((i) => ({
        src: "/sfx/soft-thud.mp3",
        at: t.land + i * t.step - 0.004,
        gain: 0.5,
      })),
      { src: "/sfx/card-fan.mp3", at: t.spin - 0.02, gain: 0.18 },
    ]);
  });

  it("holds every code clip to a moment of its scene", () => {
    for (const game of ["who-am-i", "impostor", "lineup"] as const)
      for (const first of [true, false]) {
        const moments = titleMoments(game, first, 5);
        for (const c of codeClips(game, first))
          expect(clipStarts(c, moments).length, `${game} ${c.id}`).toBe(
            c.each ? 5 : 1,
          );
      }
  });

  it("takes the panel's list in place of the code's", () => {
    const land = codeClips("who-am-i", false).find((c) => c.id === "land");
    setSiteTunes({
      "scenes.who-am-i.later": JSON.stringify([
        { ...land, offset: 0.1, fadeOut: 0.2, trimOut: 0.5 },
        { ...land, id: "x1", off: true },
      ]),
    });
    try {
      const t = whoTimes(false, 2);
      expect(titleCues("who-am-i", false, 2)).toEqual(
        [0, 1].map((i) => ({
          src: "/sfx/soft-thud.mp3",
          at: t.land + i * t.step + 0.1,
          gain: 0.5,
          to: 0.5,
          fadeOut: 0.2,
        })),
      );
    } finally {
      setSiteTunes({});
    }
  });
});
