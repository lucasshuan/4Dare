// The parts of a match both games share: shows and reveals on the clock,
// step clocks and their cuts, the podium. Pure, like the engine.
import { findPlayer, isPresent } from "./helpers";
import {
  type BeatKind,
  CLOCK_CUT_FLOOR_MS,
  type Ctx,
  type ErrorCode,
  GameError,
  type PlayerId,
  RESULT_SECONDS,
  type Reveal,
  type RoomState,
  type RuleExamples,
  type ShowKind,
  type StepTime,
} from "./types";

export const fail = (code: ErrorCode): never => {
  throw new GameError(code);
};

/** The Who am I? turn steps: the guess starts under the answers reveal. */
export const TURN_PHASES = new Set([
  "asking",
  "answering",
  "guessing",
  "validating",
]);

const isShow = (r: Reveal | null | undefined): r is Reveal =>
  !!r &&
  (r.kind === "opening" ||
    r.kind === "theme" ||
    r.kind === "cast" ||
    r.kind === "deal");
/** A guess's result, or a pass, on the whole screen: the next turn waits for it. */
const isGuessScene = (r: Reveal | null | undefined): r is Reveal =>
  !!r && (r.kind === "guess" || r.kind === "pass");

/** Puts a guess's result (or a pass) on screen for `ms`, scaled like the shows. */
export function guessScene(
  s: RoomState,
  kind: "guess" | "pass",
  n: number,
  ms: number,
  ctx: Ctx,
) {
  const scale = ctx.showScale && ctx.showScale > 0 ? ctx.showScale : 1;
  s.reveal = {
    kind,
    n,
    startsAt: ctx.now,
    until: ctx.now + Math.round(ms * scale),
  };
}

/** A beat and its length (ms) before scaling; a 0 drops it. */
export type Part = [BeatKind, number];

/**
 * Puts a show on screen: its beats back to back, from now, or from the end of
 * a show still playing (kept as `prev` so it plays out, never nested deeper).
 * Returns when it ends.
 */
export function stage(
  s: RoomState,
  kind: ShowKind,
  n: number,
  first: boolean,
  parts: Part[],
  ctx: Ctx,
  rule?: RuleExamples | null,
) {
  const scale = ctx.showScale && ctx.showScale > 0 ? ctx.showScale : 1;
  const running =
    isShow(s.reveal) && ctx.now < s.reveal.until
      ? { ...s.reveal, prev: null }
      : null;
  const startsAt = Math.max(ctx.now, running?.until ?? 0);
  let t = startsAt;
  const beats = [];
  for (const [beat, ms] of parts) {
    if (ms <= 0) continue;
    const until = t + Math.round(ms * scale);
    beats.push({ kind: beat, startsAt: t, until });
    t = until;
  }
  s.reveal = {
    kind,
    n,
    startsAt,
    until: t,
    beats,
    first,
    prev: running,
    ...(rule !== undefined ? { rule } : {}),
  };
  return t;
}

/**
 * Starts a step. The guessing step starts at once, under the answers reveal
 * (players close it when they like); the rest, and any step under a show or
 * a guess's scene, wait for what is on screen.
 */
export function startStep(s: RoomState, ctx: Ctx, ms: number) {
  const waits =
    isShow(s.reveal) || isGuessScene(s.reveal) || !TURN_PHASES.has(s.phase);
  const start = Math.max(ctx.now, waits ? (s.reveal?.until ?? 0) : 0);
  s.stepStartsAt = start;
  s.deadline = start + ms;
  s.stepMs = ms;
}

export const stepMs = (s: RoomState, key: StepTime) => s.settings[key] * 1000;

export function stopClock(s: RoomState) {
  s.deadline = null;
  s.stepStartsAt = null;
  s.stepMs = null;
}

/**
 * One of the `people` who act in this step (vote, answer) did, and others
 * still owe theirs: the clock loses the step's time divided by `people`, so
 * each gets an even share and the last ones don't keep everybody waiting. It
 * never goes below `floor` (CLOCK_CUT_FLOOR_MS) from now, nor moves later.
 */
export function cutClock(
  s: RoomState,
  ctx: Ctx,
  key: StepTime,
  people: number,
  floor = CLOCK_CUT_FLOOR_MS,
) {
  if (s.deadline === null || people < 1) return;
  const cut = Math.round(stepMs(s, key) / people);
  s.deadline = Math.min(
    s.deadline,
    Math.max(s.deadline - cut, ctx.now + floor),
  );
}

export function guardStep(s: RoomState, ctx: Ctx) {
  if (s.stepStartsAt !== null && ctx.now < s.stepStartsAt) fail("too_early");
}

export function requireSeated(s: RoomState, id: PlayerId) {
  return findPlayer(s, id) ?? fail("not_member");
}

export function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Match `round` plays the long shows: the room's first, or someone's first ever. */
export const longShows = (s: RoomState, round: number) =>
  round === 1 || s.newcomer;

/** The podium; its clock (after the last reveal) takes everyone back to the lobby. */
export function finish(s: RoomState, ctx: Ctx) {
  // A match that ends mid-show goes to the podium at once; a guess reveal still holds it.
  if (isShow(s.reveal) && ctx.now < s.reveal.until) {
    s.reveal = null;
    // Play was to start once the cast ended: it never got there, so the record starts now.
    if (s.playStartedAt !== null)
      s.playStartedAt = Math.min(s.playStartedAt, ctx.now);
  }
  s.phase = "finished";
  s.turnPlayerId = null;
  startStep(s, ctx, RESULT_SECONDS * 1000);
  keepMatch(s, ctx);
}

/** How many finished matches the lobby lists. */
const PAST_MATCHES = 5;

/** Puts the match that just finished on top of the room's list, if it got to the questions. */
function keepMatch(s: RoomState, ctx: Ctx) {
  if (s.playStartedAt === null) return;
  const imp = s.imp;
  // the Impostor's winners share first place
  const won = (id: PlayerId) =>
    imp?.winner
      ? imp.impostors.includes(id) === (imp.winner === "impostors")
      : false;
  const players = s.players
    .filter((p) => (imp ? imp.dealt.includes(p.id) : s.assignments[p.id]))
    .map((p) => ({
      id: p.id,
      isGuest: p.isGuest,
      name: p.name,
      guestNumber: p.guestNumber,
      avatar: p.avatar,
      colorSlot: p.colorSlot,
      place: imp ? (won(p.id) ? 1 : null) : (s.outcomes[p.id]?.place ?? null),
    }))
    .sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity));
  const match = {
    round: s.round,
    theme: s.theme,
    finishedAt: ctx.now,
    players,
  };
  s.matches = [match, ...(s.matches ?? [])].slice(0, PAST_MATCHES);
}

export const presentCount = (s: RoomState) =>
  s.players.filter(isPresent).length;

export function cleanText(text: string, max: number) {
  const t = text.trim();
  if (!t || t.length > max) fail("invalid_input");
  return t;
}
