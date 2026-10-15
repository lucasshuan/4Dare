// The lab's match: a whole room played by the real engine on a made-up clock,
// with bots in the seats, so any moment of any game can be watched from any
// seat without opening a room or a private window. The same kit, settings and
// inputs give the same match, frame for frame: every random draw is seeded.
import { botMove } from "@/game/bots";
import type { BotKit } from "@/game/bots/kit";
import { createRoom, reduce } from "@/game/engine";
import { GAME_SEATS, type GameKey } from "@/game/games";
import { guestAvatar } from "@/game/guest-names";
import {
  type Character,
  DEFAULT_SETTINGS,
  type GameEvent,
  type Identity,
  type Lang,
  type PlayerId,
  type RoomState,
  type RoomView,
  type StartFields,
  type Theme,
} from "@/game/types";
import { toView } from "@/game/view";

/** How the bots play: at once, never (the clock decides), or some of each. */
export type BotMode = "fast" | "clock" | "mix";

export interface LabSettings {
  game: GameKey;
  players: number;
  seed: number;
  /** The room's first match of the game, or the one after (the short versions). */
  match: "first" | "later";
  bots: BotMode;
  lang: Lang;
}

/** What the server prepared for a lab match (src/server/admin/lab.ts): what a real start would get. */
export interface LabKit {
  start: Omit<StartFields, "playerId">;
  bot: BotKit;
  /** Characters for the cards the pick clock leaves empty. */
  fallback: Character[];
  /** Themes for a host who never typed the theme. */
  timeoutThemes: Theme[];
}

/** Something a seat did by hand, at a moment of the match. */
export interface LabInput {
  at: number;
  seat: number;
  event: GameEvent;
}

/** A moment the match passes: a step starts, a show begins. */
export interface LabMark {
  at: number;
  phase: RoomState["phase"];
  label: string;
}

export interface LabRun {
  players: Identity[];
  /** Every state the room went through, with when. */
  snaps: { at: number; state: RoomState }[];
  marks: LabMark[];
  start: number;
  end: number;
  stateAt(t: number): RoomState;
  viewAt(t: number, seat: number): RoomView;
  /** Bots' moves the engine turned down, for the lab's log. */
  skipped: number;
}

/** The lab's clock starts on a fixed day, so a link always shows the same thing. */
export const LAB_T0 = Date.UTC(2026, 9, 4, 12);
const CODE = "LAB01";
const MAX_EVENTS = 4000;
const MAX_SPAN = 2 * 3600_000;

/** Deterministic 0..1 (mulberry32). */
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

/** A string to a 32-bit seed. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The lab's people: guests numbered from the seed, so every seat has its usual creature and name. */
export function labPeople(n: number, seed: number, lang: Lang): Identity[] {
  const r = rng(seed ^ 0x9e3779b9);
  return Array.from({ length: n }, (_, i) => {
    const guestNumber = 100 + Math.floor(r() * 9800);
    return {
      id: `lab-${i + 1}`,
      isGuest: true,
      name: null,
      guestNumber,
      avatar: guestAvatar(guestNumber),
      lang,
    };
  });
}

/** How many seats a game's lab may have. */
export const seatsOf = (game: GameKey) => GAME_SEATS[game];

const PHASE_PT: Partial<Record<RoomState["phase"], string>> = {
  lobby: "Lobby",
  theming: "Tema digitado",
  voting: "Voto no tema",
  picking: "Escolha",
  asking: "Pergunta",
  answering: "Respostas",
  guessing: "Palpite",
  validating: "Conferir palpite",
  replying: "Resposta",
  talking: "Discussão",
  last_chance: "Último palpite",
  choosing: "Missão",
  queueing: "Fila de lotes",
  bidding: "Leilão",
  halftime: "Intervalo",
  trading: "Trocas",
  defending: "Montar o time",
  presenting: "Apresentação",
  verdict: "Veredito",
  judging: "Voto nos times",
  tiebreak: "Desempate",
  scoring: "Placar",
  finished: "Fim",
  closed: "Fechada",
};
export const phaseLabel = (p: RoomState["phase"]) => PHASE_PT[p] ?? p;

/** What makes a step a new one for the bots (each seat tries once per step). */
const stepKey = (s: RoomState) =>
  [
    s.phase,
    s.stepStartsAt,
    s.turnPlayerId,
    s.round,
    s.lu?.lot,
    s.lu?.showing,
    s.lu?.round,
    s.imp?.asked.length,
    s.imp?.round,
    s.imp?.guessing,
    s.plays.length,
  ].join("|");

/**
 * The match for these settings, kit and inputs. `from` starts it from a real
 * room's state instead (the lab's "load a room"): its players stay, bots
 * play them all, the clock starts where the room was.
 */
export function simulate(
  kit: LabKit,
  settings: LabSettings,
  inputs: readonly LabInput[] = [],
  opts: { hand?: number | null; from?: RoomState } = {},
): LabRun {
  const random = rng(settings.seed);
  let now = opts.from ? opts.from.updatedAt : LAB_T0 - 120_000;
  let state: RoomState;
  let players: Identity[];
  const snaps: { at: number; state: RoomState }[] = [];
  const marks: LabMark[] = [];
  let skipped = 0;
  let events = 0;
  const apply = (event: GameEvent) => {
    const next = reduce(state, event, { now, random });
    events++;
    if (
      next.phase !== state.phase ||
      next.stepStartsAt !== state.stepStartsAt ||
      next.reveal?.startsAt !== state.reveal?.startsAt
    )
      marks.push({
        at: next.reveal?.startsAt ?? now,
        phase: next.phase,
        label: phaseLabel(next.phase),
      });
    state = next;
    snaps.push({ at: now, state });
  };
  const tryApply = (event: GameEvent) => {
    try {
      apply(event);
      return true;
    } catch {
      skipped++;
      return false;
    }
  };

  if (opts.from) {
    state = opts.from;
    players = state.players.map((p) => ({
      id: p.id,
      isGuest: p.isGuest,
      name: p.name,
      guestNumber: p.guestNumber,
      avatar: p.avatar,
      lang: p.lang,
    }));
    snaps.push({ at: now, state });
    marks.push({ at: now, phase: state.phase, label: phaseLabel(state.phase) });
  } else {
    players = labPeople(settings.players, settings.seed, settings.lang);
    state = createRoom(
      CODE,
      players[0],
      {
        ...DEFAULT_SETTINGS,
        game: settings.game,
        seats: seatsOf(settings.game).max,
      },
      { now, random },
    );
    snaps.push({ at: now, state });
    marks.push({ at: now, phase: "lobby", label: "Lobby" });
    for (const p of players.slice(1)) {
      apply({ type: "JOIN", player: p });
      apply({ type: "SET_READY", playerId: p.id, ready: true });
    }
  }
  const host = state.hostId;
  const ins = [...inputs].sort((a, b) => a.at - b.at);
  let nextInput = 0;

  /** Plays until the match ends: bots, inputs and the clock. */
  const play = (fast: boolean) => {
    const tried = new Set<string>();
    const limit = now + MAX_SPAN;
    while (events < MAX_EVENTS && now < limit) {
      if (state.phase === "finished" || state.phase === "closed") return;
      const key = stepKey(state);
      const base = Math.max(now, state.stepStartsAt ?? now);
      let due = Number.POSITIVE_INFINITY;
      let move: { at: number; event: GameEvent; id: string } | null = null;
      players.forEach((p, i) => {
        if (!fast && opts.hand === i) return;
        const id = `${key}#${p.id}`;
        if (tried.has(id)) return;
        const r = rng(hash(`${settings.seed}|${id}`));
        const slow =
          !fast &&
          (settings.bots === "clock" ||
            (settings.bots === "mix" &&
              rng(hash(`${settings.seed}|${p.id}`))() < 0.5));
        const event = botMove(state, p.id, r, kit.bot);
        if (!event) return;
        if (slow) return;
        const at = base + (fast ? 300 : 700 + Math.floor(r() * 2600));
        if (at < due) {
          due = at;
          move = { at, event, id };
        }
      });
      const input = !fast ? ins[nextInput] : undefined;
      const deadline = state.deadline ?? Number.POSITIVE_INFINITY;
      const next = Math.min(
        due,
        deadline,
        input?.at ?? Number.POSITIVE_INFINITY,
      );
      if (!Number.isFinite(next)) return;
      now = Math.max(now, next);
      if (input && input.at <= next) {
        nextInput++;
        tryApply(input.event);
        continue;
      }
      if (deadline <= next) {
        tryApply({
          type: "TIMEOUT",
          ...(state.phase === "theming" ? { themes: kit.timeoutThemes } : {}),
          ...(state.phase === "picking"
            ? { fallbackCharacters: kit.fallback, drafted: {} }
            : {}),
        });
        continue;
      }
      const m = move as { at: number; event: GameEvent; id: string } | null;
      if (m) {
        tried.add(m.id);
        tryApply(m.event);
      }
    }
  };

  if (!opts.from) {
    if (settings.match === "later") {
      now = LAB_T0 - 100_000;
      apply({ type: "START", playerId: host, ...kit.start });
      play(true);
      now += 3000;
      tryApply({ type: "BACK_TO_LOBBY", playerId: host });
      for (const p of players.slice(1))
        tryApply({ type: "SET_READY", playerId: p.id, ready: true });
    }
    now = Math.max(now, LAB_T0);
    apply({ type: "START", playerId: host, ...kit.start });
  }
  play(false);
  const finished = state.phase === "finished";
  // the end stays until the next match: long enough to watch its scene
  const end = now + (finished ? 30_000 : 5000);
  const start = snaps[0].at;
  const indexAt = (t: number) => {
    let lo = 0;
    let hi = snaps.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (snaps[mid].at <= t) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  return {
    players,
    snaps,
    marks,
    start,
    end,
    skipped,
    stateAt: (t) => snaps[indexAt(t)].state,
    viewAt: (t, seat) =>
      toView(
        snaps[indexAt(t)].state,
        indexAt(t) + 1,
        players[Math.min(seat, players.length - 1)].id,
        t,
        settings.lang,
      ),
  };
}

/** What a seat is doing at a moment, for the strip above the screen. */
export function seatStatus(s: RoomState, id: PlayerId): string {
  const imp = s.imp;
  const lu = s.lu;
  switch (s.phase) {
    case "lobby":
      return s.players.find((p) => p.id === id)?.ready || id === s.hostId
        ? "pronto"
        : "no lobby";
    case "voting":
      return s.vote && id in s.vote.votes ? "votou" : "votando";
    case "theming":
      return id === s.hostId ? "digitando o tema" : "esperando o tema";
    case "picking": {
      const a = Object.values(s.assignments).find((x) => x.pickerId === id);
      return a?.character ? "escolheu" : "escolhendo";
    }
    case "asking":
      return s.turnPlayerId === id ? "pergunta agora" : "esperando";
    case "answering": {
      if (s.turnPlayerId === id) return "esperando respostas";
      const last = s.plays.at(-1);
      return last?.kind === "question" && last.answers.some((a) => a.by === id)
        ? "respondeu"
        : "respondendo";
    }
    case "guessing":
      return s.turnPlayerId === id ? "palpita agora" : "esperando";
    case "validating":
      return "conferindo";
    case "replying": {
      const open = imp?.asked.at(-1);
      return open?.answers[id] ? "respondeu" : "respondendo";
    }
    case "talking":
      return imp?.vote?.votes[id] ? "votou" : "discutindo";
    case "last_chance":
      return imp?.guessing === id ? "último palpite" : "esperando";
    case "bidding":
      return lu?.passed.includes(id)
        ? "passou"
        : lu && id in lu.bids
          ? `deu ${lu.bids[id]}`
          : "no leilão";
    case "judging":
      return lu?.rounds.at(-1)?.votes[id] ? "votou" : "votando";
    case "finished":
      return "no fim";
    default:
      return lu?.done.includes(id)
        ? "pronto"
        : phaseLabel(s.phase).toLowerCase();
  }
}
