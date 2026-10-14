import { GAME_SEATS, type GameKey } from "@/game/games";
import { pickColorSlot } from "@/game/seat-colors";
import type { PlayerView, WatcherView } from "@/game/types";
import type { moveSomeone } from "@/server/actions";

// A move between the seats and the watchers is shown the moment it is asked
// for. The room's view and the watchers' list are read apart, so they catch
// up one after the other: the room with the action's answer, the watchers
// with the read after it. Until both have, the move is settled on whatever
// the lists say now, so nobody vanishes or jumps back in between.

/** A move between the seats and the watchers, as the server takes it (moveSomeone). */
export type Move = Parameters<typeof moveSomeone>[1];

export interface Lists {
  players: PlayerView[];
  watchers: WatcherView[];
  /** How many watch in all, the ones shown included. */
  total: number;
}

/** A move on its way: what it is, and what settling it on a list that has not heard yet needs. */
export interface PendingMove {
  move: Move;
  /** Whoever the move carries, as they were when it began: their card on the side that lacks them. */
  people: Record<string, WatcherView>;
  /** A swap of two: whether `a` ends up before `b`; a list already in that order has heard. */
  aFirst?: boolean;
}

export const asWatcher = (p: PlayerView): WatcherView => ({
  id: p.id,
  isYou: p.isYou,
  isGuest: p.isGuest,
  name: p.name,
  avatar: p.avatar,
});

/** Someone watching, seated for the moment the server takes to say so. */
const asPlayer = (
  w: WatcherView,
  colorSlot: number,
  seat: number,
): PlayerView => ({
  id: w.id,
  isYou: w.isYou,
  isHost: false,
  isGuest: w.isGuest,
  name: w.name,
  avatar: w.avatar,
  ready: false,
  status: "not_ready",
  seat,
  colorSlot,
  turnOrder: null,
  isTurn: false,
  card: null,
  cardHidden: false,
  pickedById: null,
  discoveredAt: null,
  place: null,
  gaveUp: false,
  away: false,
  hidden: false,
});

/** `move` as it is about to be asked for; `everyone` is whoever it may carry. */
export function prepare(
  move: Move,
  lists: Lists,
  everyone: WatcherView[],
): PendingMove {
  const ids =
    move.kind === "seat" || move.kind === "stand"
      ? [move.id]
      : move.kind === "swap-seat"
        ? [move.seated, move.watcher]
        : [];
  const people: Record<string, WatcherView> = {};
  for (const id of ids) {
    const w = everyone.find((p) => p.id === id);
    if (w) people[id] = w;
  }
  if (move.kind === "swap-players") {
    const i = lists.players.findIndex((p) => p.id === move.a);
    const j = lists.players.findIndex((p) => p.id === move.b);
    return { move, people, aFirst: j < i };
  }
  if (move.kind === "swap-watchers") {
    const i = lists.watchers.findIndex((w) => w.id === move.a);
    const j = lists.watchers.findIndex((w) => w.id === move.b);
    return { move, people, aFirst: j < i };
  }
  return { move, people };
}

/**
 * The lists as they will be once `pending` lands, whatever each already
 * says: a side that has heard is left alone. Then nobody appears twice: for
 * a moment someone can be in both lists (the move shown and the server's
 * answer), and the seat wins.
 */
export function applyMove(
  lists: Lists,
  pending: PendingMove | null,
  game: GameKey,
): Lists {
  const next = pending ? settle(lists, pending, game) : lists;
  const seen = new Set<string>();
  const once = <T extends { id: string }>(list: T[]) =>
    list.filter((x) => !seen.has(x.id) && seen.add(x.id));
  const players = once(next.players);
  const watchers = once(next.watchers);
  return {
    players,
    watchers,
    total: Math.max(
      watchers.length,
      next.total - (next.watchers.length - watchers.length),
    ),
  };
}

function settle(lists: Lists, pending: PendingMove, game: GameKey): Lists {
  const { move, people } = pending;
  const P = [...lists.players];
  const W = [...lists.watchers];
  let total = lists.total;
  const pi = (id: string) => P.findIndex((p) => p.id === id);
  const wi = (id: string) => W.findIndex((w) => w.id === id);

  /** Out of the seat, if still in it: which it was. */
  const leaveSeat = (id: string) => {
    const i = pi(id);
    if (i >= 0) P.splice(i, 1);
    return i;
  };
  /** Out of the watchers, if still among them: which they were. */
  const leaveWatchers = (id: string) => {
    const j = wi(id);
    if (j >= 0) {
      W.splice(j, 1);
      total--;
    }
    return j;
  };
  /** Among the watchers, unless there already. */
  const toWatchers = (id: string, at: number) => {
    if (wi(id) >= 0) return;
    const w = people[id];
    if (!w) return;
    W.splice(at < 0 ? W.length : Math.min(at, W.length), 0, w);
    total++;
  };
  /** Seated, unless there already: the colour the server will pick. */
  const toSeat = (id: string, at: number) => {
    if (pi(id) >= 0) return;
    const w = people[id];
    if (!w) return;
    const i = at < 0 ? P.length : Math.min(at, P.length);
    const colorSlot = pickColorSlot(
      P.map((p) => p.colorSlot),
      w.avatar.color,
      GAME_SEATS[game].max,
    );
    P.splice(i, 0, asPlayer(w, colorSlot, i));
  };

  switch (move.kind) {
    case "stand":
      leaveSeat(move.id);
      toWatchers(move.id, -1);
      break;
    case "seat":
      leaveWatchers(move.id);
      toSeat(move.id, move.at ?? -1);
      break;
    case "swap-seat": {
      const i = leaveSeat(move.seated);
      toSeat(move.watcher, i);
      const j = leaveWatchers(move.watcher);
      toWatchers(move.seated, j);
      break;
    }
    case "swap-players": {
      const i = pi(move.a);
      const j = pi(move.b);
      const aFirst = i < j;
      if (i >= 0 && j >= 0 && aFirst !== pending.aFirst)
        [P[i], P[j]] = [P[j], P[i]];
      break;
    }
    case "swap-watchers": {
      const i = wi(move.a);
      const j = wi(move.b);
      const aFirst = i < j;
      if (i >= 0 && j >= 0 && aFirst !== pending.aFirst)
        [W[i], W[j]] = [W[j], W[i]];
      break;
    }
  }
  return { players: P, watchers: W, total };
}
