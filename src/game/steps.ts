// The parts of a match every game shares: shows and reveals on the clock,
// step clocks and their cuts, the podium. Pure, like the engine.
import { findPlayer, isPresent } from "./helpers";
import { luPlaces } from "./lineup/places";
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
  SHOW_KINDS,
  SHOW_TIMING,
  type ShowKind,
  type StepTime,
  type TitleCard,
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
  !!r && (SHOW_KINDS as readonly string[]).includes(r.kind);
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
    // a match's opening carries what its title scene shows
    ...(beats.some((b) => b.kind === "title") ? { title: titleCard(s) } : {}),
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

/** Which of this game's matches in the room the current one is (1 = its first); counted at START. */
export const gameRound = (s: RoomState) => s.played?.[s.settings.game] ?? 1;

/** A match of the room's game starts: one more of them. */
export function countMatch(s: RoomState) {
  const game = s.settings.game;
  s.played = { ...s.played, [game]: (s.played?.[game] ?? 0) + 1 };
}

/**
 * The match plays the long shows: the game's first in the room, or someone's
 * first ever. A later one is the same group playing the game again.
 */
export const longShows = (s: RoomState) => gameRound(s) === 1 || s.newcomer;

/** The title scene's beat: long with the rules after it, short when the group plays again. */
export const titlePart = (s: RoomState): Part => [
  "title",
  longShows(s) ? SHOW_TIMING.title.first : SHOW_TIMING.title.later,
];

/** What the title scene shows: this game's match number, and on a rematch who won the last one and is still seated. */
export function titleCard(s: RoomState): TitleCard {
  const seated = new Set(s.players.map((p) => p.id));
  const last = longShows(s) ? [] : (s.champions?.[s.settings.game] ?? []);
  return { n: gameRound(s), crowned: last.filter((id) => seated.has(id)) };
}

/**
 * What a start's ready check opens with: the title card and whether its shows
 * run long, as `begin` will count them, so every page can rehearse the very
 * scene it is about to play.
 */
export function upcomingTitle(
  s: RoomState,
  newcomer: boolean,
): { title: TitleCard; first: boolean } {
  const next = { ...s, newcomer };
  countMatch(next);
  return { title: titleCard(next), first: longShows(next) };
}

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
  const lu = s.lu;
  // the Impostor's winners share first place; What for? ranks by points
  const won = (id: PlayerId) =>
    imp?.winner
      ? imp.impostors.includes(id) === (imp.winner === "impostors")
      : false;
  const places = lu ? luPlaces(lu) : null;
  const placeOf = (id: PlayerId) =>
    places
      ? (places[id] ?? null)
      : imp
        ? won(id)
          ? 1
          : null
        : (s.outcomes[id]?.place ?? null);
  const players = s.players
    .filter((p) =>
      lu
        ? lu.dealt.includes(p.id)
        : imp
          ? imp.dealt.includes(p.id)
          : s.assignments[p.id],
    )
    .map((p) => ({
      id: p.id,
      isGuest: p.isGuest,
      name: p.name,
      guestNumber: p.guestNumber,
      avatar: p.avatar,
      colorSlot: p.colorSlot,
      place: placeOf(p.id),
    }))
    .sort((a, b) => (a.place ?? Infinity) - (b.place ?? Infinity));
  const match = {
    round: s.round,
    theme: s.theme,
    finishedAt: ctx.now,
    players,
  };
  s.matches = [match, ...(s.matches ?? [])].slice(0, PAST_MATCHES);
  // the next match of this game crowns them on its title scene
  s.champions = {
    ...s.champions,
    [s.settings.game]: players.filter((p) => p.place === 1).map((p) => p.id),
  };
}

/** When the host is gone (or away mid-match), the room goes to whoever joined first. */
export function handOverHost(s: RoomState) {
  const host = findPlayer(s, s.hostId);
  if (host && isPresent(host)) return;
  const next =
    s.players.find((p) => isPresent(p) && p.id !== s.hostId) ??
    (host ? null : s.players[0]);
  if (next) {
    s.hostId = next.id;
    next.ready = true;
    // the host is never silenced
    if (s.muted) s.muted = s.muted.filter((id) => id !== next.id);
  }
}

export const presentCount = (s: RoomState) =>
  s.players.filter(isPresent).length;

export function cleanText(text: string, max: number) {
  const t = text.trim();
  if (!t || t.length > max) fail("invalid_input");
  return t;
}
