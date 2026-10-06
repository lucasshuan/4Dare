// The lab's room, built with the real engine: a whole match played on a made-up clock
// (lobby, opening, vote or typed theme, theme show, picks, cast, a turn, the podium), so
// every show at every moment is a real room state seen through the real view, exactly
// what a player's screen gets. Each scene's lab file can add its own fixtures.
import { createRoom, reduce } from "@/game/engine";
import {
  type AnswerValue,
  type Character,
  DEFAULT_SETTINGS,
  type GameEvent,
  type Identity,
  type PlayerId,
  type RoomState,
  type RoomView,
} from "@/game/types";
import { toView } from "@/game/view";
import {
  LAB_CHARACTERS,
  LAB_EXAMPLES,
  labPlayers,
  labThemes,
  type SceneFixtures,
} from "./fixtures";
import type { LabParams, LabShow } from "./params";
import * as cast from "./scenarios/cast";
import * as chat from "./scenarios/chat";
import * as draw from "./scenarios/draw";
import * as opening from "./scenarios/opening";
import * as pick from "./scenarios/pick";
import * as theme from "./scenarios/theme";

/** One file per scene, in the order they play; later ones win. */
const SCENES = [opening, theme, draw, pick, cast, chat];

/** The lab's server clock starts on a fixed day, so a link always shows the same thing. */
const T0 = Date.UTC(2026, 9, 4, 12);
const CODE = "STAGE";

export interface LabRoom {
  /** Whose screen it is. */
  viewer: PlayerId;
  /** Where each part of the match starts (server ms). */
  marks: Record<LabShow, number>;
  /** The match's span on the clock, lobby to podium. */
  start: number;
  end: number;
  /** The room at server time `now`. */
  state(now: number): RoomState;
  /** The room as the viewer sees it at server time `now`. */
  view(now: number): RoomView;
  /** React Query data the scenes read (see SceneFixtures). */
  queries: { key: readonly unknown[]; data: unknown }[];
}

/** Server time of `at` seconds from a mark. */
export const labTime = (room: LabRoom, show: LabShow, at: number) =>
  room.marks[show] + Math.round(at * 1000);

/** Everything the scenes add, over the lab's defaults. */
export function labFixtures(params: LabParams): Required<SceneFixtures> {
  const fx: Required<SceneFixtures> = {
    themes: labThemes(params.set),
    examples: labThemes(params.set).map(() => LAB_EXAMPLES),
    typedTheme: "Space pirates",
    characters: LAB_CHARACTERS,
    draft: {
      characterId: null,
      name: "Ms. Marvel",
      imageUrl: null,
      newId: null,
    },
    question:
      params.lang === "pt"
        ? "Eu sou da Marvel?"
        : params.lang === "ja"
          ? "マーベルのキャラ？"
          : "Am I from Marvel?",
    queries: [],
  };
  for (const scene of SCENES) {
    const { queries, ...rest } = scene.scenario(params);
    for (const [k, v] of Object.entries(rest))
      if (v !== undefined) Object.assign(fx, { [k]: v });
    if (queries) fx.queries.push(...queries);
  }
  return fx;
}

/** Deterministic 0..1 (mulberry32), so the order and the draws never change. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The room, event by event, with every state kept at the time it happened. */
class Run {
  now: number;
  state: RoomState;
  snaps: { at: number; state: RoomState }[] = [];
  private random = rng(7);

  constructor(host: Identity, typed: boolean, now: number) {
    this.now = now;
    this.state = createRoom(
      CODE,
      host,
      { ...DEFAULT_SETTINGS, seats: 4, themeMode: typed ? "host" : "vote" },
      { now, random: this.random },
    );
    this.snaps.push({ at: now, state: this.state });
  }

  do(event: GameEvent) {
    this.state = reduce(this.state, event, {
      now: this.now,
      random: this.random,
    });
    this.snaps.push({ at: this.now, state: this.state });
  }

  /** Moves the clock on (never back). */
  to(at: number) {
    this.now = Math.max(this.now, at);
  }

  get finished() {
    return this.state.phase === "finished";
  }

  get revealUntil() {
    return this.state.reveal?.until ?? this.now;
  }
}

/** The room for these settings. Throws if a scene's fixtures make an event fail. */
export function labRoom(params: LabParams): LabRoom {
  const fx = labFixtures(params);
  const people = labPlayers(params);
  const host = people[0].id;
  const viewer = people[params.you].id;
  const run = new Run(people[0], params.typed, T0 - 120_000);
  for (const p of people.slice(1)) {
    run.do({ type: "JOIN", player: p });
    run.do({ type: "SET_READY", playerId: p.id, ready: true });
  }
  if (params.match === "later") playOneMatch(run, fx, people, host);

  const marks = {} as Record<LabShow, number>;
  run.to(T0 - 4000);
  marks.lobby = run.now;
  run.to(T0);
  const first = run.state.round === 0;
  const cards = first && !params.typed && params.rule === "cards";
  run.do({
    type: "START",
    playerId: host,
    themes: fx.themes,
    ...(cards ? { examples: fx.examples } : {}),
  });
  marks.opening = run.now;
  marks.vote = run.revealUntil;

  // the theme: typed by the host, or voted (everyone, a moment apart)
  if (params.typed) {
    run.to(marks.vote + 2500);
    run.do({ type: "SET_THEME", playerId: host, text: fx.typedTheme });
  } else {
    people.forEach((p, i) => {
      run.to(marks.vote + 900 * (i + 1));
      const option = params.tie
        ? people.length === 4
          ? i % 2
          : i
        : i === 1 && people.length > 2
          ? 1
          : 0;
      run.do({ type: "VOTE", playerId: p.id, option });
    });
  }
  marks.theme = run.state.reveal?.startsAt ?? run.now;
  marks.pick = run.revealUntil;

  // the picks: the viewer last, so their card is still open while the others confirm
  const seatOf = (id: PlayerId) => people.findIndex((p) => p.id === id);
  const cardFor = (target: PlayerId) =>
    fx.characters[seatOf(target) % fx.characters.length];
  const cards4 = Object.entries(run.state.assignments).sort(
    ([, a], [, b]) =>
      Number(a.pickerId === viewer) - Number(b.pickerId === viewer),
  );
  if (params.timeout) {
    // one card confirmed, the viewer's left as a draft, the rest empty
    const [[target, a]] = cards4;
    run.to(marks.pick + 2000);
    if (a.pickerId !== viewer)
      run.do({
        type: "PICK",
        playerId: a.pickerId,
        character: cardFor(target),
      });
    run.to(marks.pick + 3500);
    run.do({ type: "DRAFT", playerId: viewer, draft: fx.draft });
    run.to(run.state.deadline ?? run.now);
    run.do({
      type: "TIMEOUT",
      fallbackCharacters: cards4.map(([t]) => cardFor(t)),
    });
  } else {
    cards4.forEach(([target, a], k) => {
      run.to(marks.pick + 1600 * (k + 1));
      run.do({
        type: "PICK",
        playerId: a.pickerId,
        character: cardFor(target),
      });
    });
  }
  marks.cast = run.state.reveal?.startsAt ?? run.now;
  marks.turn = run.revealUntil;

  // the first turn: a question, the answers, the guess (a hit, a miss the
  // picker turns down, or a pass); then everyone else gives up
  const asker = run.state.turnPlayerId ?? host;
  run.to(marks.turn + 3000);
  run.do({ type: "ASK", playerId: asker, text: fx.question });
  const values: AnswerValue[] = ["no", "probably_no", "yes"];
  people
    .filter((p) => p.id !== asker)
    .forEach((p, i) => {
      run.to(run.now + 1200);
      run.do({
        type: "ANSWER",
        playerId: p.id,
        value: values[i % values.length],
        note: null,
      });
    });
  run.to(run.revealUntil + 1000);
  const mine: Character | null =
    run.state.assignments[asker]?.character ?? null;
  if (params.guess === "pass") run.do({ type: "PASS", playerId: asker });
  else if (params.guess === "miss") {
    run.do({ type: "GUESS", playerId: asker, text: "Batman" });
    run.to(run.now + 2500);
    run.do({
      type: "VALIDATE",
      playerId: run.state.assignments[asker]?.pickerId ?? host,
      correct: false,
    });
  } else run.do({ type: "GUESS", playerId: asker, text: mine?.name ?? "?" });
  run.to(run.revealUntil + 1000);
  while (!run.finished) {
    run.do({ type: "GIVE_UP", playerId: run.state.turnPlayerId ?? host });
    if (!run.finished) run.to(run.now + 1200);
  }
  marks.result = run.now;

  const snaps = run.snaps;
  const at = (now: number) => {
    let i = 0;
    while (i + 1 < snaps.length && snaps[i + 1].at <= now) i++;
    return i;
  };
  return {
    viewer,
    marks,
    start: marks.lobby,
    end: run.state.deadline ?? marks.result + 15_000,
    state: (now) => snaps[at(now)].state,
    view: (now) =>
      toView(snaps[at(now)].state, at(now) + 1, viewer, now, params.lang),
    queries: fx.queries,
  };
}

/** A whole match, played fast, so the next one is the room's second. */
function playOneMatch(
  run: Run,
  fx: Required<SceneFixtures>,
  people: Identity[],
  host: PlayerId,
) {
  run.to(T0 - 100_000);
  run.do({ type: "START", playerId: host, themes: fx.themes });
  run.to(run.revealUntil);
  if (run.state.phase === "theming")
    run.do({ type: "SET_THEME", playerId: host, text: "Robots" });
  else
    for (const p of people) run.do({ type: "VOTE", playerId: p.id, option: 2 });
  run.to(run.revealUntil);
  for (const [target, a] of Object.entries(run.state.assignments)) {
    const seat = people.findIndex((p) => p.id === target);
    run.do({
      type: "PICK",
      playerId: a.pickerId,
      character: fx.characters[(seat + 1) % fx.characters.length],
    });
  }
  run.to(run.revealUntil);
  while (!run.finished)
    run.do({ type: "GIVE_UP", playerId: run.state.turnPlayerId ?? host });
  run.to(run.now + 3000);
  run.do({ type: "BACK_TO_LOBBY", playerId: host });
  for (const p of people.slice(1))
    run.do({ type: "SET_READY", playerId: p.id, ready: true });
}
