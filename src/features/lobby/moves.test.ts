import { describe, expect, it } from "vitest";
import { pickColorSlot } from "@/game/seat-colors";
import type { PlayerView, WatcherView } from "@/game/types";
import { applyMove, asWatcher, type Lists, prepare } from "./moves";

const GAME = "who-am-i";

const watcher = (id: string): WatcherView => ({
  id,
  isYou: false,
  isGuest: true,
  name: id,
  avatar: { kind: "creature", dna: "", color: "#3366cc" },
});

const seated = (id: string, colorSlot: number, seat = 0): PlayerView => ({
  ...watcher(id),
  isHost: seat === 0,
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

const ids = (list: { id: string }[]) => list.map((x) => x.id);

/** The host, Ana and Bo seated; Cy and Di watching. */
const room = (): Lists => ({
  players: [seated("host", 0, 0), seated("ana", 1, 1), seated("bo", 2, 2)],
  watchers: [watcher("cy"), watcher("di")],
  total: 2,
});

const everyone = (l: Lists) => [...l.players.map(asWatcher), ...l.watchers];

describe("applyMove", () => {
  it("shows a player standing up until both lists say so", () => {
    const before = room();
    const pending = prepare(
      { kind: "stand", id: "bo" },
      before,
      everyone(before),
    );

    const shown = applyMove(before, pending, GAME);
    expect(ids(shown.players)).toEqual(["host", "ana"]);
    expect(ids(shown.watchers)).toEqual(["cy", "di", "bo"]);
    expect(shown.total).toBe(3);

    // the room has answered, the watchers have not been read yet
    const roomFirst: Lists = { ...before, players: before.players.slice(0, 2) };
    const mid = applyMove(roomFirst, pending, GAME);
    expect(ids(mid.players)).toEqual(["host", "ana"]);
    expect(ids(mid.watchers)).toEqual(["cy", "di", "bo"]);
    expect(mid.total).toBe(3);

    // both have
    const after: Lists = {
      players: before.players.slice(0, 2),
      watchers: [...before.watchers, watcher("bo")],
      total: 3,
    };
    expect(applyMove(after, pending, GAME)).toEqual(after);
  });

  it("seats someone watching with the colour the server picks", () => {
    const before = room();
    const pending = prepare(
      { kind: "seat", id: "cy", at: 3 },
      before,
      everyone(before),
    );
    const color = pickColorSlot([0, 1, 2], "#3366cc", 6);

    const shown = applyMove(before, pending, GAME);
    expect(ids(shown.players)).toEqual(["host", "ana", "bo", "cy"]);
    expect(shown.players[3].colorSlot).toBe(color);
    expect(ids(shown.watchers)).toEqual(["di"]);
    expect(shown.total).toBe(1);

    // the room has answered (its own card for Cy), the watchers still list them
    const server = seated("cy", 5, 3);
    const roomFirst: Lists = {
      ...before,
      players: [...before.players, server],
    };
    const mid = applyMove(roomFirst, pending, GAME);
    expect(mid.players[3]).toBe(server);
    expect(ids(mid.watchers)).toEqual(["di"]);
    expect(mid.total).toBe(1);

    const after: Lists = {
      players: [...before.players, server],
      watchers: [watcher("di")],
      total: 1,
    };
    expect(applyMove(after, pending, GAME)).toEqual(after);
  });

  it("trades a seat for a place among the watchers", () => {
    const before = room();
    const pending = prepare(
      { kind: "swap-seat", seated: "ana", watcher: "di" },
      before,
      everyone(before),
    );

    const shown = applyMove(before, pending, GAME);
    expect(ids(shown.players)).toEqual(["host", "di", "bo"]);
    expect(ids(shown.watchers)).toEqual(["cy", "ana"]);
    expect(shown.total).toBe(2);

    const server = seated("di", 1, 1);
    const roomFirst: Lists = {
      ...before,
      players: [before.players[0], server, before.players[2]],
    };
    const mid = applyMove(roomFirst, pending, GAME);
    expect(mid.players[1]).toBe(server);
    expect(ids(mid.watchers)).toEqual(["cy", "ana"]);
    expect(mid.total).toBe(2);

    const after: Lists = {
      players: roomFirst.players,
      watchers: [watcher("cy"), watcher("ana")],
      total: 2,
    };
    expect(applyMove(after, pending, GAME)).toEqual(after);
  });

  it("never swaps two players back once the room has", () => {
    const before = room();
    const pending = prepare(
      { kind: "swap-players", a: "ana", b: "bo" },
      before,
      everyone(before),
    );
    expect(ids(applyMove(before, pending, GAME).players)).toEqual([
      "host",
      "bo",
      "ana",
    ]);
    const after: Lists = {
      ...before,
      players: [before.players[0], before.players[2], before.players[1]],
    };
    expect(ids(applyMove(after, pending, GAME).players)).toEqual([
      "host",
      "bo",
      "ana",
    ]);
  });

  it("never swaps two watchers back once the list has", () => {
    const before = room();
    const pending = prepare(
      { kind: "swap-watchers", a: "cy", b: "di" },
      before,
      everyone(before),
    );
    expect(ids(applyMove(before, pending, GAME).watchers)).toEqual([
      "di",
      "cy",
    ]);
    const after: Lists = {
      ...before,
      watchers: [watcher("di"), watcher("cy")],
    };
    expect(ids(applyMove(after, pending, GAME).watchers)).toEqual(["di", "cy"]);
  });

  it("shows the viewer sitting down even past the watchers shown", () => {
    const before: Lists = { ...room(), total: 200 };
    const me = watcher("me");
    const pending = prepare({ kind: "seat", id: "me" }, before, [
      ...everyone(before),
      me,
    ]);
    const shown = applyMove(before, pending, GAME);
    expect(ids(shown.players)).toEqual(["host", "ana", "bo", "me"]);
    expect(shown.total).toBe(200);
  });

  it("lists nobody twice: the seat wins, and the count follows", () => {
    const lists: Lists = {
      players: [seated("host", 0), seated("cy", 1, 1)],
      watchers: [watcher("cy"), watcher("di")],
      total: 2,
    };
    const shown = applyMove(lists, null, GAME);
    expect(ids(shown.players)).toEqual(["host", "cy"]);
    expect(ids(shown.watchers)).toEqual(["di"]);
    expect(shown.total).toBe(1);
  });
});
