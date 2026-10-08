import { describe, expect, it } from "vitest";
import {
  ADJECTIVES,
  GUEST_NAME_COUNT,
  guestAvatar,
  guestWords,
  LEGENDARY,
  NOUNS,
  TITLES,
} from "@/game/guest-names";
import { figureSvg } from "../figures";
import { avatarColor, avatarSvg, avatarUri, dnaOf, isDna, randomDna } from ".";
import { BG } from "./engine";

/** A small seeded random, so failures repeat. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const broken = (svg: string) => /NaN|undefined|null|Infinity/.test(svg);

describe("avatars", () => {
  it("has a kit for every word of the guest names", () => {
    for (const [noun] of NOUNS) expect(isDna(dnaOf({ noun })), noun).toBe(true);
    for (const [adj] of ADJECTIVES)
      expect(isDna(dnaOf({ adj })), adj).toBe(true);
    for (const [title] of TITLES)
      expect(isDna(dnaOf({ title, f: true })), title).toBe(true);
    for (const [legend] of LEGENDARY)
      expect(isDna(dnaOf({ legend })), legend).toBe(true);
  });

  it("writes and reads DNA", () => {
    expect(dnaOf({ noun: "Cat", adj: "Happy" })).toBe("Cat..Happy..0");
    expect(dnaOf({ noun: "Potato", noun2: "Ninja" }, "k3")).toBe(
      "Potato.Ninja...k3",
    );
    expect(dnaOf({ adj: "Brave", title: "Captain", f: true })).toBe(
      "..Brave.Captain-f.0",
    );
    expect(dnaOf({ legend: "Doge" })).toBe("!Doge.0");
    expect(isDna("....0")).toBe(true);
    for (const bad of [
      "",
      "Cat",
      "Cat..Happy..",
      "Cat..Happy..0.",
      "Cat..Happy..TOOLONGVARIANT",
      "Dragonfruit..Happy..0",
      "Cat..Captain..0",
      "!Cat.0",
      "<svg>",
      "Cat..Happy..0\n",
    ])
      expect(isDna(bad), bad).toBe(false);
  });

  it("gives a guest the creature of their name, the same every time", () => {
    for (const n of [0, 1, 532, 99_999, GUEST_NAME_COUNT - 1]) {
      const a = guestAvatar(n);
      expect(a).toEqual(guestAvatar(n));
      expect(a.kind === "creature" && isDna(a.dna)).toBe(true);
      expect(BG).toContain(a.color);
    }
    expect(guestWords(0)).toEqual({ noun: NOUNS[0][0], adj: ADJECTIVES[0][0] });
  });

  it("draws sound svg for any name, big and small", () => {
    const random = seeded(7);
    for (let i = 0; i < 400; i++) {
      const dna = dnaOf(
        guestWords(Math.floor(random() * GUEST_NAME_COUNT)),
        Math.floor(random() * 1000).toString(36),
      );
      for (const size of [64, 20]) {
        const svg = avatarSvg(dna, size);
        expect(broken(svg), dna).toBe(false);
        expect(svg.startsWith("<svg")).toBe(true);
        expect(svg.length).toBeLessThan(12_000);
      }
      expect(avatarSvg(dna)).toBe(avatarSvg(dna));
    }
  });

  it("draws the plain creature for a DNA it cannot read", () => {
    expect(broken(avatarSvg("not dna"))).toBe(false);
    expect(BG).toContain(avatarColor("not dna"));
  });

  it("makes random DNA it can read back", () => {
    const random = seeded(3);
    for (let i = 0; i < 200; i++) expect(isDna(randomDna(random))).toBe(true);
  });

  it("encodes data URIs an <img> can load", () => {
    const uri = avatarUri("Cat..Happy..0");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    expect(uri).not.toMatch(/[#"<>]/);
    expect(avatarUri("Cat..Happy..0", 20)).not.toBe(uri);
  });

  it("draws the game art's figures", () => {
    for (const f of [
      "cat",
      "lion",
      "giraffe",
      "lady",
      "king",
      "owl",
      "astronaut",
    ] as const)
      expect(broken(figureSvg(f)), f).toBe(false);
  });
});
