// Thousands of random matches: every step keeps the invariants and nobody ever sees their own card.
import { describe, expect, it } from "vitest";
import { isExpired, reduce } from "./engine";
import { Game, rng, THEMES } from "./test-utils";
import {
  ANSWERS,
  type BeatKind,
  type Character,
  GameError,
  type GameEvent,
  RESULT_SECONDS,
  REVEAL_TIMING,
  type Reveal,
  type RoomState,
  SHOW_TIMING,
} from "./types";
import { toView } from "./view";

const isShow = (r: Reveal | null | undefined): r is Reveal =>
  !!r && (r.kind === "opening" || r.kind === "theme" || r.kind === "cast");

/** Each show's beats, in the order they may come. */
const SHOW_BEATS: Record<string, BeatKind[]> = {
  opening: ["curtain", "intro", "round", "entrance"],
  theme: ["tie_spin", "settle", "theme", "rule", "draw", "target", "entrance"],
  cast: ["picked", "received", "order", "entrance"],
};

/** The lengths a beat may have, for the room's first match or a later one. */
function beatLengths(show: string, kind: BeatKind, first: boolean): number[] {
  const T = SHOW_TIMING;
  const v = first ? "first" : "later";
  switch (kind) {
    case "curtain":
      return [T.curtain];
    case "intro":
      return [T.intro];
    case "round":
      return [T.round];
    case "entrance":
      return show === "opening"
        ? [T.entrance.vote, T.entrance.theming]
        : show === "theme"
          ? [T.entrance.pick]
          : [T.entrance.turn[v]];
    case "tie_spin":
      return [T.tieSpin];
    case "settle":
      return [T.settle[v]];
    case "theme":
      return first ? [T.theme.withRule] : [T.theme.alone];
    case "rule":
      return [T.rule.cards, T.rule.sentence];
    case "draw":
      return [T.draw[v]];
    case "target":
      return [T.target[v]];
    case "picked":
      return [T.picked.confirmed[v], T.picked.timeout];
    case "received":
      return [T.received[v]];
    case "order":
      return [T.order[v]];
  }
}

/** Beats back to back, in their order, with their lengths; a show waiting behind another starts at its end. */
function checkShow(r: Reveal) {
  const beats = r.beats ?? [];
  const order = SHOW_BEATS[r.kind];
  expect(beats.length).toBeGreaterThan(0);
  expect(r.first).toBe(r.n === 1);
  expect(beats[0].startsAt).toBe(r.startsAt);
  expect(beats.at(-1)?.until).toBe(r.until);
  let last = -1;
  beats.forEach((b, i) => {
    if (i > 0) expect(b.startsAt).toBe(beats[i - 1].until);
    const at = order.indexOf(b.kind);
    expect(at, `${b.kind} in ${r.kind}`).toBeGreaterThan(last);
    last = at;
    expect(beatLengths(r.kind, b.kind, !!r.first)).toContain(
      b.until - b.startsAt,
    );
  });
  // only the first match has a rule, and every show ends on an entrance
  expect(beats.some((b) => b.kind === "rule")).toBe(
    r.kind === "theme" && !!r.first,
  );
  expect(beats.at(-1)?.kind).toBe("entrance");
  if (r.prev) {
    expect(isShow(r.prev)).toBe(true);
    expect(r.prev.prev ?? null).toBeNull();
    expect(r.startsAt).toBe(r.prev.until);
  }
}

const secret = (id: string): Character => ({
  id: `sid-${id}-x9`,
  lang: "pt",
  name: `zq-name-${id}`,
  origin: `zq-origin-${id}`,
  imageUrl: `https://zq.test/${id}.png`,
  aliases: [`zq-alias-${id}`],
});

function randomEvent(s: RoomState, r: () => number): GameEvent {
  const ids = [...s.players.map((p) => p.id), "ghost"];
  const who = ids[Math.floor(r() * ids.length)];
  const roll = r();
  if (roll < 0.04) return { type: "LEAVE", playerId: who };
  if (roll < 0.07) return { type: "GIVE_UP", playerId: who };
  if (roll < 0.15)
    return {
      type: "TIMEOUT",
      themes: THEMES,
      fallbackCharacters: s.players.map((p) => secret(`fb-${p.id}`)),
      // the server found or made some drafts' characters (by picker)
      drafted: Object.fromEntries(
        s.players
          .filter(() => r() < 0.3)
          .map((p) => [p.id, secret(`dr-${p.id}`)]),
      ),
    };
  if (roll < 0.22) return { type: "START", playerId: who, themes: THEMES };
  if (roll < 0.25)
    return { type: "VOTE", playerId: who, option: Math.floor(r() * 4) };
  if (roll < 0.39) {
    const target =
      Object.keys(s.assignments).find(
        (t) => s.assignments[t].pickerId === who,
      ) ?? who;
    if (roll < 0.35)
      return { type: "PICK", playerId: who, character: secret(target) };
    return {
      type: "DRAFT",
      playerId: who,
      draft:
        r() < 0.15
          ? null
          : {
              characterId: r() < 0.3 ? `zq-dcid-${target}` : null,
              name: r() < 0.2 ? "" : `zq-draft-${target}`,
              imageUrl:
                r() < 0.5 ? `https://zq.test/draft-${target}.png` : null,
              newId: r() < 0.5 ? `u-zq-${target}` : null,
            },
    };
  }
  if (roll < 0.5)
    return { type: "ASK", playerId: who, text: r() < 0.1 ? "" : "Q?" };
  if (roll < 0.7) {
    const value = ANSWERS[Math.floor(r() * ANSWERS.length)];
    return {
      type: "ANSWER",
      playerId: who,
      value,
      note: r() < 0.3 ? "note" : null,
    };
  }
  if (roll < 0.8) {
    const name = r() < 0.5 ? `zq-name-${who}` : "nope";
    return { type: "GUESS", playerId: who, text: name };
  }
  if (roll < 0.85) return { type: "PASS", playerId: who };
  if (roll < 0.95)
    return { type: "VALIDATE", playerId: who, correct: r() < 0.5 };
  return { type: "BACK_TO_LOBBY", playerId: who };
}

function checkInvariants(s: RoomState) {
  if (
    ["picking", "asking", "answering", "guessing", "validating"].includes(
      s.phase,
    )
  ) {
    const ids = s.players.map((p) => p.id).sort();
    expect(Object.keys(s.assignments).sort()).toEqual(ids);
    expect(
      Object.values(s.assignments)
        .map((a) => a.pickerId)
        .sort(),
    ).toEqual(ids);
    for (const [t, a] of Object.entries(s.assignments))
      expect(a.pickerId).not.toBe(t);
    expect(s.deadline).not.toBeNull();
    // answers can cut the clock short, never stretch it
    const left = (s.deadline ?? 0) - (s.stepStartsAt ?? 0);
    if (s.phase === "answering")
      expect(left).toBeLessThanOrEqual(s.stepMs ?? 0);
    else expect(left).toBe(s.stepMs);
  }
  // turn steps start under an answers or guess reveal; every show holds the clock
  if (isShow(s.reveal) && s.stepStartsAt !== null)
    expect(s.stepStartsAt).toBeGreaterThanOrEqual(s.reveal.until);
  if (s.phase === "lobby") expect(s.reveal).toBeNull();
  if (s.phase === "voting" || s.phase === "theming") {
    expect(s.reveal?.kind).toBe("opening");
    expect(s.stepStartsAt).toBe(s.reveal?.until);
  }
  // a draft only sits on a card nobody filled yet
  for (const a of Object.values(s.assignments))
    if (a.draft) expect(a.character).toBeNull();
  if (
    s.phase === "asking" ||
    s.phase === "guessing" ||
    s.phase === "validating"
  ) {
    expect(s.turnPlayerId).not.toBeNull();
  }
  if (s.phase === "finished") {
    expect((s.deadline ?? 0) - (s.stepStartsAt ?? 0)).toBe(
      RESULT_SECONDS * 1000,
    );
    expect(s.turnPlayerId).toBeNull();
  }
  if (s.phase === "closed") {
    expect(s.deadline).toBeNull();
    expect(s.turnPlayerId).toBeNull();
  }
  expect(s.plays.map((p) => p.n)).toEqual(s.plays.map((_, i) => i + 1));
  const placed = Object.values(s.outcomes).filter((o) => o.place !== null);
  const places = placed.map((o) => o.place as number).sort((a, b) => a - b);
  // podium places: discoveries in the same turn round share one (1, 1, 3)
  expect(places).toEqual(places.map((p) => places.indexOf(p) + 1));
  for (const a of placed)
    for (const b of placed)
      if (a.place === b.place) expect(a.round).toBe(b.round);
  if (s.reveal) {
    const len = s.reveal.until - s.reveal.startsAt;
    const t = REVEAL_TIMING;
    if (s.reveal.kind === "answers") {
      expect(len).toBeGreaterThanOrEqual(t.answersMin);
      expect(len).toBeLessThanOrEqual(t.answersMax);
    } else if (s.reveal.kind === "guess") {
      expect([t.guessHit, t.guessMiss]).toContain(len);
    } else {
      checkShow(s.reveal);
    }
  }
}

function checkSecrecy(s: RoomState, now: number) {
  for (const p of s.players) {
    // what the picker has on the card for p is the picker's alone
    const draft = s.assignments[p.id]?.draft;
    if (draft) {
      const json = JSON.stringify(toView(s, 1, p.id, now));
      for (const bit of [
        draft.name,
        draft.imageUrl,
        draft.characterId,
        draft.newId,
      ])
        if (bit)
          expect(json, `${p.id} sees the draft "${bit}"`).not.toContain(bit);
    }
    const own = s.assignments[p.id]?.character;
    const o = s.outcomes[p.id];
    const mayKnow =
      s.phase === "finished" || o?.discoveredAt != null || o?.gaveUp;
    if (!own || mayKnow) continue;
    const json = JSON.stringify(toView(s, 1, p.id, now));
    for (const bit of [
      own.id,
      own.name,
      ...(own.origin ? [own.origin] : []),
      ...(own.imageUrl ? [own.imageUrl] : []),
      ...own.aliases,
    ]) {
      if (json.includes(bit)) {
        // a guess typed as the exact name is the player's own words, not a leak
        const typed = s.plays.some(
          (x) => x.kind === "guess" && x.by === p.id && x.text.includes(bit),
        );
        expect(typed, `${p.id} sees "${bit}" in ${s.phase}`).toBe(true);
      }
    }
  }
}

/** The vote stays in the view while its theme show plays, even with the cast queued behind it. */
function checkVoteView(s: RoomState, now: number) {
  const r = s.reveal;
  const theme =
    r?.kind === "theme" ? r : r?.prev?.kind === "theme" ? r.prev : null;
  if (!s.vote || !theme || now >= theme.until) return;
  for (const p of s.players)
    expect(toView(s, 1, p.id, now).vote, `vote for ${p.id}`).not.toBeNull();
}

describe("random play", () => {
  it("keeps every invariant and every secret", () => {
    let matchesFinished = 0;
    let draftsSaved = 0;
    let draftsTaken = 0;
    // shows staged while another still plays, by kind ("theme<opening", "cast<theme")
    const queued = new Set<string>();
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed * 7919);
      const g = new Game(2 + (seed % 3), seed);
      // events sent right away, at the same time (everyone votes during the opening)
      const burst: GameEvent[] = [];
      for (let step = 0; step < 250; step++) {
        const follow = burst.shift();
        // now and then only a moment passes, so things happen while a show still plays
        if (!follow) g.now += Math.floor(r() * (r() < 0.25 ? 500 : 9000));
        const input = g.state;
        const before = JSON.stringify(input);
        const event = follow ?? randomEvent(g.state, r);
        try {
          const next = reduce(input, event, g.ctx());
          if (
            ["ASK", "ANSWER", "GUESS", "PASS", "VALIDATE"].includes(event.type)
          ) {
            expect(g.now).toBeGreaterThanOrEqual(g.state.stepStartsAt ?? 0);
          }
          if (event.type === "TIMEOUT")
            expect(isExpired(g.state, g.now)).toBe(true);
          if (event.type === "DRAFT" && event.draft) draftsSaved++;
          // the clock took a card someone left unconfirmed
          if (event.type === "TIMEOUT" && input.phase === "picking")
            draftsTaken += Object.entries(input.assignments).filter(
              ([t, a]) => !a.character && !next.assignments[t].auto,
            ).length;
          // half the time, everyone votes as soon as the vote opens, during the opening
          if (event.type === "START" && next.phase === "voting" && r() < 0.5)
            for (const p of next.players)
              burst.push({
                type: "VOTE",
                playerId: p.id,
                option: Math.floor(r() * 3),
              });
          g.state = next;
        } catch (e) {
          if (!(e instanceof GameError)) throw e;
        }
        expect(JSON.stringify(input)).toBe(before);
        checkInvariants(g.state);
        checkSecrecy(g.state, g.now);
        checkVoteView(g.state, g.now);
        const shown = g.state.reveal;
        if (isShow(shown) && shown.prev && g.now < shown.prev.until)
          queued.add(`${shown.kind}<${shown.prev.kind}`);
        if (g.state.phase === "finished") matchesFinished++;
        if (g.state.phase === "closed") break;
      }
    }
    expect(matchesFinished).toBeGreaterThan(0);
    expect(draftsSaved).toBeGreaterThan(0);
    expect(draftsTaken).toBeGreaterThan(0);
    // shows queued behind a running one happened, so checkShow saw their `prev`
    expect([...queued].sort()).toEqual(["cast<theme", "theme<opening"]);
  }, 30_000); // 300 matches: give a busy machine room
});
