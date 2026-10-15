import { describe, expect, it } from "vitest";
import type { Sanction } from "./backend/people-types";
import { standingOf } from "./sanctions";

const s = (over: Partial<Sanction>): Sanction => ({
  id: 1,
  person: "p",
  kind: "ban",
  until: null,
  reason: "x",
  wipe: false,
  upTo: 0,
  author: null,
  at: 0,
  liftedAt: null,
  seenAt: null,
  ...over,
});

describe("what the panel decided about someone", () => {
  it("keeps a ban or a mute in force until it ends or is lifted", () => {
    const now = 1_000;
    expect(standingOf([s({ until: null })], now).ban?.id).toBe(1);
    expect(standingOf([s({ until: 999 })], now).ban).toBeNull();
    expect(standingOf([s({ liftedAt: 500 })], now).ban).toBeNull();
    expect(standingOf([s({ kind: "mute", until: 2_000 })], now).mute?.id).toBe(
      1,
    );
  });

  it("shows a warning until it is read; an archive is nothing", () => {
    expect(standingOf([s({ kind: "warn" })]).warn?.id).toBe(1);
    expect(standingOf([s({ kind: "warn", seenAt: 5 })]).warn).toBeNull();
    const none = standingOf([s({ kind: "none" })]);
    expect([none.ban, none.mute, none.warn]).toEqual([null, null, null]);
  });
});
