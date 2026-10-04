// Where a room stands on stage at a given server time: the area and screen, the show and
// beat playing, when the header's theme tag, clock and history show up, and the backdrop.
// Pure: the room, the lab and the tests all derive it from (view, server time), so every
// screen lands on the same frame, after a reload too.

import {
  type Beat,
  type BeatKind,
  type Phase,
  type RevealView,
  type RoomView,
  SHOW_MARKS,
  type ShowView,
} from "@/game/types";
import { type Look, NO_LOOK, seatLook, type Tone } from "./stage-backdrop";

export type { Glyphs, Look, Tone } from "./stage-backdrop";

export type StageArea = "lobby" | "match" | "result" | "closed";
export type StageScreen = "theming" | "vote" | "pick" | "turn";

export interface StageFrame {
  area: StageArea;
  /** The match screen; null outside the match area. */
  screen: StageScreen | null;
  /** A winning hit's reveal still runs before the podium. */
  finishedWait: boolean;
  /**
   * The show on screen: the one running, or (beat null) the one about to start
   * when the clock reads a hair before it (clock skew).
   */
  show: ShowView | null;
  /** The beat running; null between shows or just before one. */
  beat: Beat | null;
  /** The header's theme tag shows from this server time; null = hidden. */
  themeFrom: number | null;
  /** The header's clock shows from this server time; null = no clock. */
  clockFrom: number | null;
  /** True: a show holds the clock, which pops in at `clockFrom`. False: today's recharge under an answers or guess reveal. */
  clockPops: boolean;
  /** The history button and give up show from this server time; null = not on this screen. */
  historyFrom: number | null;
  /** The backdrop. */
  look: Look;
  /** The next server time at which any field above changes; null = none coming. */
  next: number | null;
}

const TURN_PHASES: ReadonlySet<Phase> = new Set([
  "asking",
  "answering",
  "guessing",
  "validating",
]);
const MATCH_PHASES: ReadonlySet<Phase> = new Set([
  "theming",
  "voting",
  "picking",
  ...TURN_PHASES,
]);

export const isShow = (r: RevealView | null | undefined): r is ShowView =>
  !!r && (r.kind === "opening" || r.kind === "theme" || r.kind === "cast");

/** The beat of that kind in a show, if the show has one. */
export function beatOf(
  show: ShowView | null | undefined,
  kind: BeatKind,
): Beat | null {
  return show?.beats.find((b) => b.kind === kind) ?? null;
}

/** A moment `ms` into a beat, kept inside it (e2e runs shorten the beats, not the marks). */
export function markAt(beat: Beat, ms: number): number {
  return Math.max(beat.startsAt, Math.min(beat.until, beat.startsAt + ms));
}

/** A mark that differs between the room's first match and the later ones. */
export function markOf(
  mark: number | { first: number; later: number },
  first: boolean,
): number {
  return typeof mark === "number" ? mark : first ? mark.first : mark.later;
}

/** The beat running at `now`, if any. */
export function beatAt(show: ShowView, now: number): Beat | null {
  return show.beats.find((b) => now >= b.startsAt && now < b.until) ?? null;
}

/**
 * The show on screen at `now`: the one still running when the current one was
 * staged (`prev`) while it lasts, then the current one. Before its first beat
 * (only clock skew gets there) it comes with beat null.
 */
export function showAt(
  view: RoomView,
  now: number,
): { show: ShowView; beat: Beat | null } | null {
  if (!MATCH_PHASES.has(view.phase)) return null;
  const r = view.reveal;
  if (!isShow(r)) return null;
  if (r.prev && now < r.prev.until)
    return { show: r.prev, beat: beatAt(r.prev, now) };
  if (now >= r.until) return null;
  return { show: r, beat: beatAt(r, now) };
}

/** The shows a view carries: the current one and the one still playing before it. */
const showsOf = (view: RoomView): ShowView[] => {
  const r = view.reveal;
  if (!isShow(r)) return [];
  return r.prev ? [r.prev, r] : [r];
};

const showOfKind = (view: RoomView, kind: ShowView["kind"]) =>
  showsOf(view).find((s) => s.kind === kind) ?? null;

/** The screen a beat plays on. */
function beatScreen(
  view: RoomView,
  show: ShowView,
  kind: BeatKind,
): StageScreen {
  if (show.kind === "opening") return view.vote ? "vote" : "theming";
  if (show.kind === "theme") {
    if (kind === "draw" || kind === "target" || kind === "entrance")
      return "pick";
    // a voted theme settles the vote first; a typed one has no settle
    return view.vote || beatOf(show, "settle") ? "vote" : "theming";
  }
  return kind === "picked" ? "pick" : "turn";
}

function phaseScreen(phase: Phase): StageScreen | null {
  if (phase === "theming") return "theming";
  if (phase === "voting") return "vote";
  if (phase === "picking") return "pick";
  return TURN_PHASES.has(phase) ? "turn" : null;
}

function phaseArea(phase: Phase): StageArea {
  if (phase === "lobby") return "lobby";
  if (phase === "closed") return "closed";
  if (phase === "finished") return "result";
  return "match";
}

/** Where the room stands at server time `now`. */
export function stageFrame(view: RoomView, now: number): StageFrame {
  const on = showAt(view, now);
  const area = on ? "match" : phaseArea(view.phase);
  const screen = on
    ? beatScreen(view, on.show, (on.beat ?? on.show.beats[0]).kind)
    : area === "match"
      ? phaseScreen(view.phase)
      : null;
  const r = view.reveal;
  const finishedWait =
    view.phase === "finished" && !!r && !isShow(r) && now < r.until;

  // the theme tag: hidden until the theme beat's mark while a theme show is ahead or on
  let themeFrom: number | null = null;
  if (area === "match" && view.theme) {
    const theme = showOfKind(view, "theme");
    const beat = beatOf(theme, "theme");
    themeFrom = theme
      ? beat
        ? markAt(beat, SHOW_MARKS.themeTag)
        : theme.startsAt
      : 0;
  }

  // the clock: a show holds it until its step starts; answers and guess reveals recharge it
  let clockFrom: number | null = null;
  let clockPops = false;
  if (
    area === "match" &&
    view.deadline !== null &&
    view.stepStartsAt !== null
  ) {
    clockPops = isShow(r);
    clockFrom =
      !clockPops && r && now < r.until && r.startsAt < view.stepStartsAt
        ? r.startsAt
        : view.stepStartsAt;
  }

  // history and give up: the turn screen only, from the cast's entrance on
  let historyFrom: number | null = null;
  if (area === "match" && screen === "turn") {
    const cast = showOfKind(view, "cast");
    const entrance = beatOf(cast, "entrance");
    historyFrom = cast
      ? entrance
        ? markAt(entrance, SHOW_MARKS.historyIn)
        : cast.until
      : 0;
  }

  const { look, next: lookNext } = stageLook(view, now);
  const moments = [lookNext, themeFrom, clockFrom, historyFrom];
  for (const s of showsOf(view)) {
    moments.push(s.startsAt, s.until);
    for (const b of s.beats) moments.push(b.startsAt, b.until);
  }
  if (r && !isShow(r)) moments.push(r.until);
  moments.push(view.stepStartsAt);

  return {
    area,
    screen,
    finishedWait,
    show: on?.show ?? null,
    beat: on?.beat ?? null,
    themeFrom,
    clockFrom,
    clockPops,
    historyFrom,
    look,
    next: earliestAfter(now, moments),
  };
}

function earliestAfter(now: number, moments: (number | null)[]) {
  let next: number | null = null;
  for (const m of moments)
    if (m !== null && m > now && (next === null || m < next)) next = m;
  return next;
}

// ---------------------------------------------------------------------------
// The backdrop (plan 1.9): each step has its colour; while picking and during
// the cast it is a seat's, which differs per viewer by design.
// ---------------------------------------------------------------------------

const BRAND: Look = {
  tone: "brand",
  glyphs: "q",
  glyphColor: "var(--brand-butter)",
  fade: 0.7,
};
const BUTTER: Look = {
  tone: "butter",
  glyphs: "q",
  glyphColor: "var(--on-butter)",
  fade: 0.8,
};

const seatTone = (seat: number) => `seat-${(seat % 4) + 1}` as Tone;

/** The backdrop at `now`, and when it changes next. */
export function stageLook(
  view: RoomView,
  now: number,
): { look: Look; next: number | null } {
  // the theme's own glyphs: its set's emoji, or a typed theme's pen and "?"
  const glyphs: Pick<Look, "glyphs" | "glyphColor"> =
    view.theme && !view.theme.set
      ? { glyphs: "typed", glyphColor: "var(--sky)" }
      : { glyphs: "set", glyphColor: "var(--ink)" };
  const theme: Look = { tone: "theme", ...glyphs, fade: 1.1 };
  const seatOf = (id: string | null | undefined) =>
    view.players.find((p) => p.id === id)?.seat ?? null;
  const withSet = (seat: number | null): Look =>
    seat === null ? theme : { tone: seatTone(seat), ...glyphs, fade: 0.8 };
  const withQ = (seat: number | null): Look => seatLook(seat, 1);
  const target = () => withSet(seatOf(view.pick?.targetId));
  const pickedMine = () =>
    withSet(seatOf(view.players.find((p) => p.isYou)?.pickedById));
  const firstPlayer = () => withQ(seatOf(view.turn?.playerId));

  const on = showAt(view, now);
  if (on) {
    const { show } = on;
    // a hair before its first beat (clock skew): that beat's first look
    const beat = on.beat ?? show.beats[0];
    const t = on.beat ? now : beat.startsAt;
    const until = on.beat ? beat.until : show.startsAt;
    /** Look `a` until the mark, `b` from it. */
    const split = (ms: number, a: Look, b: Look) => {
      const m = markAt(beat, ms);
      return t < m
        ? { look: a, next: on.beat ? m : until }
        : { look: b, next: until };
    };
    const first = show.first;
    switch (beat.kind) {
      case "curtain":
        return split(SHOW_MARKS.curtainWash, NO_LOOK, BRAND);
      case "intro":
      case "round":
        return { look: BRAND, next: until };
      case "tie_spin":
      case "settle":
        return { look: BUTTER, next: until };
      case "theme":
        return split(SHOW_MARKS.themeWash, BUTTER, theme);
      case "rule":
        return { look: theme, next: until };
      case "draw":
        return split(markOf(SHOW_MARKS.targetWash, first), BRAND, target());
      case "target":
      case "picked":
        return { look: target(), next: until };
      case "received":
        return { look: pickedMine(), next: until };
      case "order":
        return split(
          markOf(SHOW_MARKS.orderSpot, first),
          pickedMine(),
          firstPlayer(),
        );
      case "entrance":
        return {
          look:
            show.kind === "opening"
              ? BUTTER
              : show.kind === "theme"
                ? target()
                : firstPlayer(),
          next: until,
        };
    }
  }

  const r = view.reveal;
  switch (view.phase) {
    case "theming":
    case "voting":
      return { look: BUTTER, next: null };
    case "picking":
      return { look: target(), next: null };
    case "finished":
      // the winning hit's reveal keeps the guesser's colour until the podium
      return r?.kind === "guess" && now < r.until
        ? { look: withQ(seatOf(r.byId)), next: r.until }
        : { look: NO_LOOK, next: null };
    default:
      return TURN_PHASES.has(view.phase)
        ? { look: withQ(seatOf(view.turn?.playerId)), next: null }
        : { look: NO_LOOK, next: null };
  }
}
