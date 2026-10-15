import { describe, expect, it } from "vitest";
import { reduce } from "./engine";
import { OPEN_GAMES } from "./games";
import { SHOW_MARKS, SHOW_TIMING } from "./show-timing";
import { Game, THEMES } from "./test-utils";
import {
  cleanTunes,
  defaultAt,
  entryOf,
  leavesOf,
  TUNABLES,
  tunesFor,
} from "./tunables";
import { setSiteTunes, withTunes } from "./tune";
import {
  DEFAULT_SETTINGS,
  ENGINE,
  type GameEvent,
  type RoomConfig,
} from "./types";

describe("the tunables registry", () => {
  it("points every entry at a value of the code", () => {
    for (const e of TUNABLES) {
      const leaves = leavesOf(e);
      expect(leaves.length, e.key).toBeGreaterThan(0);
      for (const k of leaves) {
        const d = defaultAt(k);
        const want =
          e.unit === "bool"
            ? "boolean"
            : e.unit === "choice"
              ? "string"
              : "number";
        expect(typeof d, k).toBe(want);
        if (typeof d === "number") {
          if (e.min !== undefined) expect(d, k).toBeGreaterThanOrEqual(e.min);
          if (e.max !== undefined) expect(d, k).toBeLessThanOrEqual(e.max);
        }
      }
    }
  });

  it("lists each leaf once", () => {
    const all = TUNABLES.flatMap(leavesOf);
    expect(new Set(all).size).toBe(all.length);
  });

  it("keeps only known values, in range, that differ from the code", () => {
    expect(
      cleanTunes({
        "lu.halftime": 25_000.4,
        "lu.snipe": 5000,
        "engine.startWait": 99_999,
        "room.trades": false,
        "room.mode": "nope",
        "opening.title.first": 1000,
        "made.up": 3,
        "reveal.pass": "slow",
      }),
    ).toEqual({
      "lu.halftime": 25_000,
      "engine.startWait": 15_000,
      "room.trades": false,
    });
    expect(entryOf("cast.received.later")?.key).toBe("cast.received");
  });

  it("gives a room its game's values and the shared ones", () => {
    expect(
      tunesFor(
        { "lu.halftime": 1, "reveal.pass": 2, "opening.curtain": 3 },
        "lineup",
      ),
    ).toEqual({ "lu.halftime": 1, "opening.curtain": 3 });
  });
});

describe("reading tunable constants", () => {
  it("reads a match's copy over the site's values, live", () => {
    setSiteTunes({ "opening.curtain": 800, "engine.startWait": 4000 });
    try {
      expect(SHOW_TIMING.curtain).toBe(800);
      expect(ENGINE.startWait).toBe(4000);
      withTunes({ "opening.curtain": 650 }, () => {
        expect(SHOW_TIMING.curtain).toBe(650);
        // the copy replaces the site's values, it doesn't stack on them
        expect(ENGINE.startWait).toBe(5500);
      });
      expect(SHOW_TIMING.curtain).toBe(800);
      expect(SHOW_MARKS.cardWarning).toBe(2400);
      withTunes({ "dealMarks.cardWarning": 2000 }, () =>
        expect(SHOW_MARKS.cardWarning).toBe(2000),
      );
      withTunes({ "room.voteSeconds": 55 }, () =>
        expect({ ...DEFAULT_SETTINGS }.voteSeconds).toBe(55),
      );
    } finally {
      setSiteTunes(null);
    }
  });

  it("drops a closed game from the menus", () => {
    expect([...OPEN_GAMES]).toContain("lineup");
    setSiteTunes({ "games.lineup": "closed" });
    try {
      expect([...OPEN_GAMES]).not.toContain("lineup");
      expect(OPEN_GAMES.includes("lineup")).toBe(false);
    } finally {
      setSiteTunes(null);
    }
  });
});

describe("a match's copy of the values", () => {
  it("is taken when the match starts and kept while it plays", () => {
    const g = new Game(3);
    const first = { v: 1, tunes: { "opening.curtain": 900 } };
    const later = { v: 2, tunes: { "opening.curtain": 400 } };
    const step = (event: GameEvent, config: RoomConfig) => {
      g.state = reduce(g.state, event, { ...g.ctx(), config });
      return g.state;
    };
    const s = step(
      { type: "START", playerId: g.state.hostId, themes: THEMES },
      first,
    );
    expect(s.cfg).toEqual(first);
    const curtain = s.reveal?.beats?.find((b) => b.kind === "curtain");
    expect(curtain && curtain.until - curtain.startsAt).toBe(900);
    // the panel saves a new version mid-match: this match keeps its copy
    g.skipShow();
    const after = step({ type: "VOTE", playerId: "p1", option: 0 }, later);
    expect(after.cfg).toEqual(first);
  });
});

describe("fractional values", () => {
  it("keeps a sound's volume to hundredths", () => {
    expect(cleanTunes({ "roomSounds.join.volume": 0.555 })).toEqual({
      "roomSounds.join.volume": 0.56,
    });
  });
});
