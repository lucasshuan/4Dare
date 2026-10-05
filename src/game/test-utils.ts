// Fixtures for the engine tests.
import { createRoom, reduce } from "./engine";
import {
  type Character,
  type Ctx,
  DEFAULT_SETTINGS,
  type GameEvent,
  type Identity,
  type RoomSettings,
  type RoomState,
  type Theme,
} from "./types";

export const THEME: Theme = {
  en: "Villains",
  pt: "Vilões",
  ja: "悪役",
  set: "heroes",
};
/** What START puts to the vote; THEME comes first. */
export const THEMES: Theme[] = [
  THEME,
  { en: "Robots", pt: "Robôs", ja: "ロボット", set: "scifi" },
  { en: "Pirates", pt: "Piratas", ja: "海賊", set: "warriors" },
];

export const ident = (id: string, guestNumber = 10): Identity => ({
  id,
  isGuest: false,
  name: id,
  guestNumber,
  avatar: { kind: "critter", seed: "x", color: "#DCE8FA" },
  lang: "pt",
});

export const char = (
  id: string,
  name = `Name ${id}`,
  aliases: string[] = [],
): Character => ({
  id,
  lang: "pt",
  name,
  origin: `Origin ${id}`,
  imageUrl: `https://img.test/${id}.png`,
  aliases,
});

/** Deterministic 0..1 generator (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A room plus a controllable clock. */
export class Game {
  now = 1_000_000;
  random: () => number;
  state: RoomState;
  /** Ctx.showScale: shortens (or stretches) every show beat. */
  showScale: number | undefined;

  constructor(players: number, seed = 1, settings: Partial<RoomSettings> = {}) {
    this.random = rng(seed);
    this.state = createRoom(
      "ABCDE",
      ident("p1"),
      { ...DEFAULT_SETTINGS, ...settings },
      this.ctx(),
    );
    for (let i = 2; i <= players; i++)
      this.do({ type: "JOIN", player: ident(`p${i}`) });
  }

  ctx(): Ctx {
    return this.showScale === undefined
      ? { now: this.now, random: this.random }
      : { now: this.now, random: this.random, showScale: this.showScale };
  }

  do(event: GameEvent) {
    this.state = reduce(this.state, event, this.ctx());
    return this.state;
  }

  /** Moves the clock to the start of the current step (past any reveal). */
  skipReveal() {
    if (this.state.stepStartsAt !== null) {
      this.now = Math.max(this.now, this.state.stepStartsAt);
    }
  }

  /** Moves the clock to the end of the show on screen (opening, theme or cast), if any. */
  skipShow() {
    const r = this.state.reveal;
    if (r && (r.kind === "opening" || r.kind === "theme" || r.kind === "cast"))
      this.now = Math.max(this.now, r.until);
  }

  /** Moves the clock past the current deadline and fires TIMEOUT. */
  timeout(extra: Partial<Extract<GameEvent, { type: "TIMEOUT" }>> = {}) {
    if (this.state.deadline !== null) this.now = this.state.deadline;
    return this.do({ type: "TIMEOUT", ...extra });
  }

  /** Starts the vote, lets the opening play and has everyone vote for THEME; picking starts after the theme show. */
  start() {
    this.do({ type: "START", playerId: this.state.hostId, themes: THEMES });
    this.skipShow();
    this.voteAll(0);
    this.skipReveal();
    return this.state;
  }

  /** Everyone still in the vote picks `option`. */
  voteAll(option: number) {
    for (const p of this.state.players) {
      if (this.state.phase !== "voting") break;
      this.do({ type: "VOTE", playerId: p.id, option });
    }
    return this.state;
  }

  /** Everyone picks; the character for player X is "c-X" named "Name X". */
  pickAll() {
    for (const [target, a] of Object.entries(this.state.assignments)) {
      this.do({
        type: "PICK",
        playerId: a.pickerId,
        character: char(`c-${target}`, `Name ${target}`),
      });
    }
    return this.state;
  }

  get turn() {
    const t = this.state.turnPlayerId;
    if (!t) throw new Error("no turn player");
    return t;
  }

  /** Asks and has everyone else answer "yes". */
  askAndAnswer(text = "Is it a villain?") {
    this.skipReveal();
    const asker = this.turn;
    this.do({ type: "ASK", playerId: asker, text });
    for (const p of this.state.players) {
      if (p.id === asker || p.away) continue;
      if (this.state.phase !== "answering") break;
      this.do({ type: "ANSWER", playerId: p.id, value: "yes", note: null });
    }
    this.skipReveal();
    return asker;
  }
}
