import { describe, expect, it } from "vitest";
import { Game } from "@/game/test-utils";
import type { RoomState } from "@/game/types";
import { toPublicRoom } from "@/game/view";
import { LISTED, LISTED_COLUMNS } from "./listing";

/** The room's top-level fields toPublicRoom touches. */
function fieldsRead(state: RoomState, now: number) {
  const read = new Set<string>();
  const spy = new Proxy(state, {
    get(target, key, receiver) {
      if (typeof key === "string") read.add(key);
      return Reflect.get(target, key, receiver);
    },
  });
  toPublicRoom(spy, now);
  return read;
}

describe("room listing", () => {
  it("reads only the listed fields, in every phase", () => {
    const lobby = new Game(3);
    const locked = new Game(1, 2, { visibility: "private", password: "pw" });
    const playing = new Game(2, 3);
    playing.start();
    playing.skipShow();
    playing.voteAll(0);
    const states = [lobby, locked, playing].map(
      (g) => [g.state, g.now] as const,
    );
    for (const [state, now] of states)
      for (const field of fieldsRead(state, now))
        expect(LISTED as readonly string[]).toContain(field);
  });

  it("lists the same room from those fields alone", () => {
    const g = new Game(3);
    const listed = Object.fromEntries(
      LISTED.map((k) => [k, g.state[k]]),
    ) as unknown as RoomState;
    expect(toPublicRoom(listed, g.now)).toEqual(toPublicRoom(g.state, g.now));
  });

  it("selects each listed field from the database", () => {
    for (const field of LISTED)
      expect(LISTED_COLUMNS).toMatch(new RegExp(`\\b${field}\\b`));
  });
});
