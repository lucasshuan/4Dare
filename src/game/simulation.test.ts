// Thousands of random matches: every step keeps the invariants and nobody ever sees their own card.
import { describe, expect, it } from "vitest";
import { isExpired, reduce } from "./engine";
import { Game, rng, THEMES } from "./test-utils";
import {
  ANSWERS,
  type Character,
  GameError,
  type GameEvent,
  RESULT_SECONDS,
  REVEAL_TIMING,
  type RoomState,
} from "./types";
import { toView } from "./view";

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
    };
  if (roll < 0.22) return { type: "START", playerId: who, themes: THEMES };
  if (roll < 0.25)
    return { type: "VOTE", playerId: who, option: Math.floor(r() * 4) };
  if (roll < 0.35) {
    const target = Object.keys(s.assignments).find(
      (t) => s.assignments[t].pickerId === who,
    );
    return { type: "PICK", playerId: who, character: secret(target ?? who) };
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
    // turn steps start under an answers or guess reveal; only the theme holds the clock
    if (s.reveal?.kind === "theme")
      expect(s.stepStartsAt ?? 0).toBeGreaterThanOrEqual(s.reveal.until);
  }
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
  const places = Object.values(s.outcomes)
    .map((o) => o.place)
    .filter((p): p is number => p !== null)
    .sort((a, b) => a - b);
  expect(places).toEqual(places.map((_, i) => i + 1));
  if (s.reveal) {
    const len = s.reveal.until - s.reveal.startsAt;
    const t = REVEAL_TIMING;
    if (s.reveal.kind === "answers") {
      expect(len).toBeGreaterThanOrEqual(t.answersMin);
      expect(len).toBeLessThanOrEqual(t.answersMax);
    } else {
      expect([
        t.guessHit,
        t.guessMiss,
        t.theme,
        t.theme + t.themeTieSpin,
      ]).toContain(len);
    }
  }
}

function checkSecrecy(s: RoomState, now: number) {
  for (const p of s.players) {
    const own = s.assignments[p.id]?.character;
    const o = s.outcomes[p.id];
    const mayKnow =
      s.phase === "finished" || o?.discoveredAt != null || o?.gaveUp;
    if (!own || mayKnow) continue;
    const json = JSON.stringify(toView(s, 1, p.id, now));
    for (const bit of [
      own.id,
      own.name,
      own.origin ?? "-",
      own.imageUrl ?? "-",
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

describe("random play", () => {
  it("keeps every invariant and every secret", () => {
    let matchesFinished = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = rng(seed * 7919);
      const g = new Game(2 + (seed % 3), seed);
      for (let step = 0; step < 250; step++) {
        g.now += Math.floor(r() * 9000);
        const input = g.state;
        const before = JSON.stringify(input);
        const event = randomEvent(g.state, r);
        try {
          const next = reduce(input, event, g.ctx());
          if (
            ["ASK", "ANSWER", "GUESS", "PASS", "VALIDATE"].includes(event.type)
          ) {
            expect(g.now).toBeGreaterThanOrEqual(g.state.stepStartsAt ?? 0);
          }
          if (event.type === "TIMEOUT")
            expect(isExpired(g.state, g.now)).toBe(true);
          g.state = next;
        } catch (e) {
          if (!(e instanceof GameError)) throw e;
        }
        expect(JSON.stringify(input)).toBe(before);
        checkInvariants(g.state);
        checkSecrecy(g.state, g.now);
        if (g.state.phase === "finished") matchesFinished++;
        if (g.state.phase === "closed") break;
      }
    }
    expect(matchesFinished).toBeGreaterThan(0);
  }, 30_000); // 300 matches: give a busy machine room
});
