import { describe, expect, it } from "vitest";
import { char, Game, THEMES } from "@/game/test-utils";
import {
  type Beat,
  type ExampleCard,
  type RoomState,
  type RuleExamples,
  SHOW_MARKS,
  SHOW_TIMING,
  type ShowView,
} from "@/game/types";
import { toView } from "@/game/view";
import {
  beatOf,
  type Look,
  markAt,
  markOf,
  type StageFrame,
  stageFrame,
  stageLook,
} from "./stage";
import { NO_LOOK } from "./stage-backdrop";

const card = (id: string): ExampleCard => ({
  id,
  imageUrl: `https://img.test/${id}.png`,
  names: { en: id, pt: id },
});
/** Rule cards for each of THEMES. */
const EXAMPLES: RuleExamples[] = THEMES.map((_, i) => ({
  fits: [card(`fit-${i}-a`), card(`fit-${i}-b`)],
  misfit: card(`misfit-${i}`),
}));

/** The view `viewer` fetched at `builtAt`, read at `now` (a view lives on until the next fetch). */
const frame = (g: Game, now: number, viewer = "p1", builtAt = now) =>
  stageFrame(toView(g.state, 1, viewer, builtAt), now);
const look = (g: Game, now: number, viewer = "p1") =>
  stageLook(toView(g.state, 1, viewer, now), now).look;

/** The show the state holds now, as a view shows it. */
const showOf = (g: Game) => toView(g.state, 1, "p1", g.now).reveal as ShowView;
const beat = (show: ShowView, kind: Beat["kind"]) => {
  const b = beatOf(show, kind);
  if (!b) throw new Error(`no ${kind} beat`);
  return b;
};
const seatOf = (g: Game, id: string) =>
  g.state.players.findIndex((p) => p.id === id);
const seatTone = (seat: number) => `seat-${(seat % 4) + 1}`;
/** Everyone picks for their target (the theme show may still be on). */
const pickAll = (g: Game) => g.pickAll();

/** Every frame from `from` to `to`, one per change, following `next` on a view fetched at `from`. */
function walk(g: Game, from: number, to: number, viewer = "p1") {
  const v = toView(g.state, 1, viewer, from);
  const frames: (StageFrame & { at: number })[] = [];
  let at: number | null = from;
  while (at !== null && at < to) {
    const f = stageFrame(v, at);
    frames.push({ ...f, at });
    if (f.next !== null) expect(f.next).toBeGreaterThan(at);
    at = f.next;
  }
  return frames;
}

/** The screen each beat plays on, read at every beat's start and just before its end. */
function screensByBeat(g: Game, show: ShowView, viewer = "p1") {
  return show.beats.map((b) => {
    const a = frame(g, b.startsAt, viewer, show.startsAt);
    const z = frame(g, b.until - 1, viewer, show.startsAt);
    expect(a.beat).toEqual(b);
    expect(z.screen).toBe(a.screen);
    expect(a.show?.kind).toBe(show.kind);
    expect(a.area).toBe("match");
    return [b.kind, a.screen];
  });
}

describe("stageFrame: the opening", () => {
  it("first match, vote: curtain, cold open, the vote coming in", () => {
    for (const players of [2, 3, 4]) {
      const g = new Game(players);
      g.do({ type: "START", playerId: "p1", themes: THEMES });
      const show = showOf(g);
      expect(show.beats.map((b) => b.kind)).toEqual([
        "curtain",
        "intro",
        "entrance",
      ]);
      expect(screensByBeat(g, show)).toEqual([
        ["curtain", "vote"],
        ["intro", "vote"],
        ["entrance", "vote"],
      ]);
      const f = frame(g, show.startsAt);
      expect(f).toMatchObject({
        themeFrom: null,
        clockFrom: show.until,
        clockPops: true,
        historyFrom: null,
        finishedWait: false,
      });
      expect(g.state.stepStartsAt).toBe(show.until);
    }
  });

  it("the backdrop: canvas, brand from the curtain's wash, butter for the vote", () => {
    const g = new Game(3);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    const show = showOf(g);
    const curtain = beat(show, "curtain");
    const wash = markAt(curtain, SHOW_MARKS.curtainWash);
    expect(look(g, curtain.startsAt)).toEqual(NO_LOOK);
    expect(frame(g, curtain.startsAt).next).toBe(wash);
    expect(look(g, wash)).toMatchObject({
      tone: "brand",
      glyphs: "q",
      glyphColor: "var(--brand-butter)",
      fade: 0.7,
    });
    expect(look(g, beat(show, "intro").startsAt).tone).toBe("brand");
    const butter = {
      tone: "butter",
      glyphs: "q",
      glyphColor: "var(--on-butter)",
      fade: 0.8,
    };
    expect(look(g, beat(show, "entrance").startsAt)).toEqual(butter);
    // the vote itself, the view fetched after the opening
    expect(look(g, show.until + 5000)).toEqual(butter);
  });

  it("after the opening: the vote screen with its clock, no show", () => {
    const g = new Game(2);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    const show = showOf(g);
    // a view fetched during the opening, read after it
    const f = frame(g, show.until + 10, "p1", show.startsAt);
    expect(f).toMatchObject({
      area: "match",
      screen: "vote",
      show: null,
      beat: null,
      clockFrom: show.until,
      next: null,
    });
    // fetched after it: the reveal is gone from the view
    expect(frame(g, show.until + 10)).toMatchObject({
      screen: "vote",
      show: null,
      clockFrom: show.until,
      clockPops: false,
    });
  });

  it("later matches: curtain, Round N, entrance", () => {
    const g = new Game(2);
    g.start();
    pickAll(g);
    g.skipShow();
    for (const id of g.state.order)
      if (g.state.phase !== "finished")
        g.do({ type: "GIVE_UP", playerId: g.state.turnPlayerId ?? id });
    expect(g.state.phase).toBe("finished");
    g.do({ type: "BACK_TO_LOBBY", playerId: "p1" });
    g.now += 1000;
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    const show = showOf(g);
    expect(show.first).toBe(false);
    expect(screensByBeat(g, show)).toEqual([
      ["curtain", "vote"],
      ["round", "vote"],
      ["entrance", "vote"],
    ]);
    expect(look(g, beat(show, "round").startsAt).tone).toBe("brand");
  });

  it("host typing: the opening plays on the theme screen", () => {
    const g = new Game(3, 1, { themeMode: "host" });
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    const show = showOf(g);
    expect(screensByBeat(g, show)).toEqual([
      ["curtain", "theming"],
      ["intro", "theming"],
      ["entrance", "theming"],
    ]);
    expect(frame(g, show.until + 1)).toMatchObject({
      screen: "theming",
      show: null,
    });
    expect(look(g, show.until + 1).tone).toBe("butter");
  });

  it("a vote closed during the opening: the opening plays out, the theme show queues", () => {
    const g = new Game(3);
    g.do({ type: "START", playerId: "p1", themes: THEMES, examples: EXAMPLES });
    const opening = showOf(g);
    g.now += 2000;
    g.voteAll(1);
    expect(g.state.phase).toBe("picking");
    const fetched = g.now;
    const theme = showOf(g);
    expect(theme.kind).toBe("theme");
    expect(theme.startsAt).toBe(opening.until);
    expect(theme.prev?.kind).toBe("opening");

    const during = frame(g, fetched + 100, "p1", fetched);
    expect(during).toMatchObject({
      area: "match",
      screen: "vote",
      show: { kind: "opening" },
      beat: { kind: "intro" },
      // the tag waits for the theme beat of the queued show, the clock for its end
      themeFrom: markAt(beat(theme, "theme"), SHOW_MARKS.themeTag),
      clockFrom: theme.until,
      clockPops: true,
    });
    expect(during.look.tone).toBe("brand");
    // once the opening is over, the theme show takes over on the same screen
    const after = frame(g, opening.until, "p1", fetched);
    expect(after.show?.kind).toBe("theme");
    expect(after.beat?.kind).toBe("settle");
    expect(after.screen).toBe("vote");
    // the boundary between them is a `next`
    expect(frame(g, opening.until - 1, "p1", fetched).next).toBe(opening.until);
  });
});

describe("stageFrame: the theme show", () => {
  it("first match, voted, rule cards: screens, tag, clock and backdrops", () => {
    for (const players of [2, 3, 4]) {
      const g = new Game(players, 5);
      g.do({
        type: "START",
        playerId: "p1",
        themes: THEMES,
        examples: EXAMPLES,
      });
      g.skipShow();
      g.voteAll(0);
      const show = showOf(g);
      expect(show.rule).toEqual(EXAMPLES[0]);
      expect(screensByBeat(g, show)).toEqual([
        ["settle", "vote"],
        ["theme", "vote"],
        ["rule", "vote"],
        ["draw", "pick"],
        ["target", "pick"],
        ["entrance", "pick"],
      ]);
      const themeBeat = beat(show, "theme");
      const f = frame(g, show.startsAt);
      expect(f.themeFrom).toBe(markAt(themeBeat, SHOW_MARKS.themeTag));
      expect(f.clockFrom).toBe(show.until);
      expect(f.clockPops).toBe(true);
      expect(f.historyFrom).toBeNull();
      expect(g.state.stepStartsAt).toBe(show.until);

      // backdrops: butter, theme from the wash, brand for the draw, then my target's seat
      const target = toView(g.state, 1, "p1", g.now).pick?.targetId ?? "";
      const targetTone = seatTone(seatOf(g, target));
      const wash = markAt(themeBeat, SHOW_MARKS.themeWash);
      expect(look(g, beat(show, "settle").startsAt).tone).toBe("butter");
      expect(look(g, wash - 1).tone).toBe("butter");
      expect(look(g, wash)).toEqual({
        tone: "theme",
        glyphs: "set",
        glyphColor: "var(--ink)",
        fade: 1.1,
      } satisfies Look);
      expect(look(g, beat(show, "rule").startsAt).tone).toBe("theme");
      const draw = beat(show, "draw");
      const targetWash = markAt(
        draw,
        markOf(SHOW_MARKS.targetWash, show.first),
      );
      expect(look(g, draw.startsAt).tone).toBe("brand");
      expect(look(g, targetWash - 1).tone).toBe("brand");
      expect(look(g, targetWash)).toMatchObject({
        tone: targetTone,
        glyphs: "set",
        fade: 0.8,
      });
      expect(look(g, beat(show, "target").startsAt).tone).toBe(targetTone);
      expect(look(g, beat(show, "entrance").startsAt).tone).toBe(targetTone);
      // picking, after the show
      expect(look(g, show.until + 1000).tone).toBe(targetTone);
      expect(frame(g, show.until + 1000)).toMatchObject({
        screen: "pick",
        show: null,
        themeFrom: 0,
      });
    }
  });

  it("each player sees their own target's colour", () => {
    const g = new Game(4, 2);
    g.start();
    const tones = g.state.players.map((p) => {
      const target = toView(g.state, 1, p.id, g.now).pick?.targetId ?? "";
      return [look(g, g.now, p.id).tone, seatTone(seatOf(g, target))];
    });
    for (const [got, want] of tones) expect(got).toBe(want);
    expect(new Set(tones.map(([t]) => t)).size).toBe(4);
  });

  it("a tie spins first; no examples: the sentence alone", () => {
    const g = new Game(3, 1);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    g.skipShow();
    g.state.players.forEach((p, i) => {
      g.do({ type: "VOTE", playerId: p.id, option: i });
    });
    const show = showOf(g);
    expect(show.rule).toBeNull();
    expect(show.beats.map((b) => b.kind)).toEqual([
      "tie_spin",
      "settle",
      "theme",
      "rule",
      "draw",
      "target",
      "entrance",
    ]);
    expect(frame(g, show.startsAt)).toMatchObject({
      screen: "vote",
      beat: { kind: "tie_spin" },
    });
    expect(look(g, show.startsAt).tone).toBe("butter");
  });

  it("a typed theme: the theme screen, pen-and-? glyphs", () => {
    const g = new Game(2, 1, { themeMode: "host" });
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    g.skipShow();
    g.do({ type: "SET_THEME", playerId: "p1", text: "Pirates" });
    const show = showOf(g);
    expect(show.rule).toBeNull();
    expect(screensByBeat(g, show)).toEqual([
      ["theme", "theming"],
      ["rule", "theming"],
      ["draw", "pick"],
      ["target", "pick"],
      ["entrance", "pick"],
    ]);
    expect(look(g, beat(show, "rule").startsAt)).toEqual({
      tone: "theme",
      glyphs: "typed",
      glyphColor: "var(--sky)",
      fade: 1.1,
    });
    expect(look(g, beat(show, "target").startsAt).glyphs).toBe("typed");
  });

  it("marks are kept inside beats an e2e run shortens", () => {
    const g = new Game(2);
    g.showScale = 0.25;
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    g.skipShow();
    g.voteAll(0);
    const show = showOf(g);
    const themeBeat = beat(show, "theme");
    expect(themeBeat.until - themeBeat.startsAt).toBeLessThan(
      SHOW_MARKS.themeTag,
    );
    expect(frame(g, show.startsAt).themeFrom).toBe(themeBeat.until);
    const draw = beat(show, "draw");
    expect(look(g, draw.until - 1).tone).toBe("brand");
    expect(markAt(draw, -50)).toBe(draw.startsAt);
  });

  it("a theme reveal saved before shows: one theme beat on the vote screen", () => {
    const g = new Game(2);
    g.start();
    const s: RoomState = g.state;
    s.reveal = {
      kind: "theme",
      n: s.round,
      startsAt: g.now,
      until: g.now + 3000,
    };
    const f = frame(g, g.now + 100);
    expect(f).toMatchObject({
      area: "match",
      screen: "vote",
      show: { kind: "theme", beats: [{ kind: "theme" }] },
      beat: { kind: "theme" },
    });
    expect(f.themeFrom).toBe(g.now + SHOW_MARKS.themeTag);
    expect(look(g, g.now + 100).tone).toBe("butter");
    expect(look(g, g.now + SHOW_MARKS.themeWash).tone).toBe("theme");
    expect(frame(g, g.now + 3000).screen).toBe("pick");
  });

  it("just before a queued show starts (clock skew): its first screen, no beat", () => {
    const g = new Game(3);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    const opening = showOf(g);
    g.now += 1000;
    g.voteAll(0);
    // fetched right as the opening ended (prev dropped), read a hair before by a client behind
    const f = frame(g, opening.until - 50, "p1", opening.until);
    expect(f).toMatchObject({
      area: "match",
      screen: "vote",
      show: { kind: "theme" },
      beat: null,
      next: opening.until,
    });
    expect(f.look.tone).toBe("butter");
  });
});

describe("stageFrame: the cast", () => {
  it("everyone confirmed: picked on the pick screen, then the turn screen", () => {
    for (const players of [2, 3, 4]) {
      const g = new Game(players, 7);
      g.start();
      pickAll(g);
      const show = showOf(g);
      expect(show.kind).toBe("cast");
      expect(screensByBeat(g, show)).toEqual([
        ["picked", "pick"],
        ["received", "turn"],
        ["order", "turn"],
        ["entrance", "turn"],
      ]);
      const entrance = beat(show, "entrance");
      const f = frame(g, show.startsAt);
      expect(f).toMatchObject({
        clockFrom: show.until,
        clockPops: true,
        themeFrom: 0,
        historyFrom: null,
      });
      expect(frame(g, beat(show, "received").startsAt).historyFrom).toBe(
        markAt(entrance, SHOW_MARKS.historyIn),
      );
      expect(g.state.stepStartsAt).toBe(show.until);
      // after the cast: the turn screen, history at once
      expect(frame(g, show.until + 10)).toMatchObject({
        screen: "turn",
        show: null,
        historyFrom: 0,
        clockPops: false,
      });
    }
  });

  it("the backdrop: my target, who picked mine, then the first player", () => {
    const g = new Game(4, 11);
    g.start();
    const v0 = toView(g.state, 1, "p1", g.now);
    const target = v0.pick?.targetId ?? "";
    pickAll(g);
    const show = showOf(g);
    const v = toView(g.state, 1, "p1", g.now);
    const mine = v.players.find((p) => p.isYou)?.pickedById ?? "";
    const firstId = v.turn?.playerId ?? "";
    expect(firstId).toBe(g.state.turnPlayerId);
    expect(look(g, show.startsAt).tone).toBe(seatTone(seatOf(g, target)));
    const received = beat(show, "received");
    expect(look(g, received.startsAt)).toMatchObject({
      tone: seatTone(seatOf(g, mine)),
      glyphs: "set",
    });
    const order = beat(show, "order");
    const spot = markAt(order, markOf(SHOW_MARKS.orderSpot, show.first));
    expect(look(g, spot - 1).tone).toBe(seatTone(seatOf(g, mine)));
    const firstLook = {
      tone: seatTone(seatOf(g, firstId)),
      glyphs: "q",
      glyphColor: `var(--${seatTone(seatOf(g, firstId))})`,
      fade: 1,
    };
    expect(look(g, spot)).toEqual(firstLook);
    expect(look(g, beat(show, "entrance").startsAt)).toEqual(firstLook);
    expect(look(g, show.until + 1)).toEqual(firstLook);
  });

  it("after a pick timeout: the longer picked beat", () => {
    const g = new Game(3);
    g.start();
    g.timeout({
      fallbackCharacters: [char("a"), char("b"), char("c")],
    });
    const show = showOf(g);
    const picked = beat(show, "picked");
    expect(picked.until - picked.startsAt).toBe(SHOW_TIMING.picked.timeout);
    expect(frame(g, picked.startsAt).screen).toBe("pick");
  });

  it("picks done during the theme show: the cast queues behind it", () => {
    const g = new Game(3);
    g.do({ type: "START", playerId: "p1", themes: THEMES });
    g.skipShow();
    g.voteAll(0);
    const theme = showOf(g);
    g.now += 500;
    pickAll(g);
    const fetched = g.now;
    const cast = showOf(g);
    expect(cast.kind).toBe("cast");
    expect(cast.prev?.kind).toBe("theme");
    expect(cast.startsAt).toBe(theme.until);
    const f = frame(g, fetched, "p1", fetched);
    expect(f).toMatchObject({
      show: { kind: "theme" },
      beat: { kind: "settle" },
      screen: "vote",
      themeFrom: markAt(beat(theme, "theme"), SHOW_MARKS.themeTag),
      clockFrom: cast.until,
    });
    expect(frame(g, beat(theme, "draw").startsAt, "p1", fetched).screen).toBe(
      "pick",
    );
    expect(frame(g, theme.until, "p1", fetched)).toMatchObject({
      show: { kind: "cast" },
      beat: { kind: "picked" },
      screen: "pick",
    });
  });
});

/** Plays a first match out (everyone gives up) and starts the second one, the opening on. */
function laterMatch(g: Game, examples?: RuleExamples[]) {
  g.start();
  pickAll(g);
  g.skipShow();
  for (const id of g.state.order)
    if (g.state.phase !== "finished")
      g.do({ type: "GIVE_UP", playerId: g.state.turnPlayerId ?? id });
  expect(g.state.phase).toBe("finished");
  g.do({ type: "BACK_TO_LOBBY", playerId: "p1" });
  g.now += 1000;
  g.do({ type: "START", playerId: "p1", themes: THEMES, examples });
  expect(showOf(g).first).toBe(false);
}

describe("stageFrame: later matches", () => {
  it("the theme show has no rule beat, and the target wash comes at its later mark", () => {
    for (const players of [2, 3, 4]) {
      const g = new Game(players, 13);
      laterMatch(g, EXAMPLES);
      g.skipShow();
      g.voteAll(0);
      const show = showOf(g);
      expect(show.kind).toBe("theme");
      expect(show.first).toBe(false);
      expect(screensByBeat(g, show)).toEqual([
        ["settle", "vote"],
        ["theme", "vote"],
        ["draw", "pick"],
        ["target", "pick"],
        ["entrance", "pick"],
      ]);
      expect(frame(g, show.startsAt).clockFrom).toBe(show.until);
      expect(g.state.stepStartsAt).toBe(show.until);
      const target = toView(g.state, 1, "p1", g.now).pick?.targetId ?? "";
      const targetTone = seatTone(seatOf(g, target));
      const draw = beat(show, "draw");
      const targetWash = markAt(draw, markOf(SHOW_MARKS.targetWash, false));
      expect(targetWash).toBeLessThan(
        markAt(draw, markOf(SHOW_MARKS.targetWash, true)),
      );
      expect(look(g, draw.startsAt).tone).toBe("brand");
      expect(look(g, targetWash - 1).tone).toBe("brand");
      expect(look(g, targetWash).tone).toBe(targetTone);
      expect(frame(g, show.until + 1000)).toMatchObject({
        screen: "pick",
        show: null,
      });
    }
  });

  it("the cast: the same screens, the first player's look at the later order mark", () => {
    for (const players of [2, 3, 4]) {
      const g = new Game(players, 17);
      laterMatch(g);
      g.skipShow();
      g.voteAll(0);
      g.skipShow();
      pickAll(g);
      const show = showOf(g);
      expect(show.kind).toBe("cast");
      expect(show.first).toBe(false);
      expect(screensByBeat(g, show)).toEqual([
        ["picked", "pick"],
        ["received", "turn"],
        ["order", "turn"],
        ["entrance", "turn"],
      ]);
      const v = toView(g.state, 1, "p1", g.now);
      const mine = v.players.find((p) => p.isYou)?.pickedById ?? "";
      const firstTone = seatTone(seatOf(g, g.state.turnPlayerId ?? ""));
      const order = beat(show, "order");
      const spot = markAt(order, markOf(SHOW_MARKS.orderSpot, false));
      expect(spot).toBeLessThan(
        markAt(order, markOf(SHOW_MARKS.orderSpot, true)),
      );
      expect(look(g, spot - 1).tone).toBe(seatTone(seatOf(g, mine)));
      expect(look(g, spot).tone).toBe(firstTone);
      expect(frame(g, show.until + 10)).toMatchObject({
        screen: "turn",
        show: null,
        historyFrom: 0,
      });
    }
  });
});

describe("stageFrame: outside the match", () => {
  it("lobby: no screen, the plain canvas, nothing coming", () => {
    const g = new Game(3);
    expect(frame(g, g.now)).toEqual({
      area: "lobby",
      screen: null,
      finishedWait: false,
      show: null,
      beat: null,
      themeFrom: null,
      clockFrom: null,
      clockPops: false,
      historyFrom: null,
      look: NO_LOOK,
      next: null,
    });
  });

  it("a winning hit's reveal holds the podium in the guesser's colour", () => {
    const g = new Game(2, 4);
    g.start();
    pickAll(g);
    g.skipShow();
    let last = "";
    while (g.state.phase !== "finished") {
      const asker = g.askAndAnswer();
      last = asker;
      g.do({ type: "GUESS", playerId: asker, text: `Name ${asker}` });
    }
    const r = g.state.reveal;
    expect(r?.kind).toBe("guess");
    const f = frame(g, g.now + 100);
    expect(f).toMatchObject({
      area: "result",
      screen: null,
      finishedWait: true,
      clockFrom: null,
      themeFrom: null,
      next: r?.until,
    });
    expect(f.look.tone).toBe(seatTone(seatOf(g, last)));
    const after = frame(g, (r?.until ?? 0) + 1, "p1", g.now);
    expect(after).toMatchObject({ area: "result", finishedWait: false });
    expect(after.look).toEqual(NO_LOOK);
  });

  it("closed rooms: no screen", () => {
    const g = new Game(2);
    g.do({ type: "LEAVE", playerId: "p2" });
    g.state.phase = "closed";
    expect(frame(g, g.now)).toMatchObject({ area: "closed", screen: null });
  });
});

describe("stageFrame: following `next`", () => {
  it("a whole first match lands on every beat in order, without skipping one", () => {
    const g = new Game(4, 9);
    g.do({ type: "START", playerId: "p1", themes: THEMES, examples: EXAMPLES });
    const opening = showOf(g);
    const seen = walk(g, opening.startsAt, opening.until + 1);
    expect(seen.map((f) => f.beat?.kind ?? null)).toEqual([
      "curtain",
      "curtain", // the wash comes in
      "intro",
      "entrance",
      null, // the vote's clock starts
    ]);
    g.skipShow();
    g.voteAll(2);
    const theme = showOf(g);
    const kinds = walk(g, theme.startsAt, theme.until + 1).map(
      (f) => f.beat?.kind ?? null,
    );
    // every beat shows up, in order (marks inside a beat repeat it)
    expect([...new Set(kinds)]).toEqual([
      ...theme.beats.map((b) => b.kind),
      null,
    ]);
    g.skipShow();
    pickAll(g);
    const cast = showOf(g);
    const castKinds = walk(g, cast.startsAt, cast.until + 1).map(
      (f) => f.beat?.kind ?? null,
    );
    expect([...new Set(castKinds)]).toEqual([
      ...cast.beats.map((b) => b.kind),
      null,
    ]);
  });
});
