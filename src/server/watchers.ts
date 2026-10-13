import "server-only";
import { admitWatcher } from "@/game/engine";
import { findPlayer } from "@/game/helpers";
import {
  type ErrorCode,
  GameError,
  type Identity,
  type PlayerId,
} from "@/game/types";
import { getBackend } from "./backend";
import type { StoredWatcher } from "./backend/types";
import { background } from "./background";
import { dispatch, leaveOtherRooms, loadRoom } from "./rooms";

// Whoever watches a room has no seat: they live in the watcher store, not in
// RoomState (see WATCHERS_SHOWN). Moving someone between a seat and the
// watchers takes two writes: the room first (the engine checks the move),
// then the watcher row.

/** Just the identity of a seat, for the watcher row it becomes. */
const identityOf = (p: Identity): Identity => ({
  id: p.id,
  isGuest: p.isGuest,
  name: p.name,
  guestNumber: p.guestNumber,
  avatar: p.avatar,
  lang: p.lang,
});

function fail(code: ErrorCode): never {
  throw new GameError(code);
}

const changed = (code: string) =>
  background(() => getBackend().notify.watchersChanged(code));

/** `id` watches `code` (fresh or not), or null. */
export async function watcherIn(
  code: string,
  id: PlayerId,
): Promise<StoredWatcher | null> {
  const w = await getBackend().watchers.get(id);
  return w?.room === code ? w : null;
}

async function requireWatcher(code: string, id: PlayerId) {
  return (await watcherIn(code, id)) ?? fail("not_member");
}

/** The room must be open, and `hostId` its host. */
async function requireHost(code: string, hostId: PlayerId) {
  const stored = await loadRoom(code);
  if (!stored || stored.state.phase === "closed") fail("not_found");
  const state = stored.state;
  if (!findPlayer(state, hostId)) fail("not_member");
  if (state.hostId !== hostId) fail("not_host");
  return state;
}

/**
 * `who` watches `code`: a full room, a match under way, or by choice. The same
 * door as a seat (kicked out, a private room's password). A seat they hold
 * here is not given up: they asked to watch from it with `stand`.
 */
export async function watch(
  code: string,
  who: Identity,
  password: string | undefined,
) {
  const stored = await loadRoom(code);
  if (!stored) fail("not_found");
  const state = stored.state;
  if (findPlayer(state, who.id)) return;
  // whoever already watches here comes back freely, like a seat
  if (!(await watcherIn(code, who.id)))
    admitWatcher(state, who.id, password, Date.now());
  await getBackend().watchers.add(code, who);
  changed(code);
  await leaveOtherRooms(who.id, code);
}

/** Out of the watchers of `code`. */
export async function stopWatching(code: string, id: PlayerId) {
  if (await getBackend().watchers.remove(id, code)) changed(code);
}

/**
 * `targetId`, watching, takes a free seat: themselves, or the host seats them
 * (`at`: which seat). Their page shows them seated with the next read.
 */
export async function sitDown(
  code: string,
  actor: Identity,
  targetId: PlayerId,
  at?: number,
) {
  const row = await requireWatcher(code, targetId);
  const player = actor.id === targetId ? actor : row.person;
  const done = await dispatch(code, () => ({
    type: "SIT",
    playerId: actor.id,
    player,
    at,
  }));
  await getBackend().watchers.remove(targetId, code);
  changed(code);
  return done;
}

/** `targetId`, seated, gets up to watch: themselves, or the host moves them. */
export async function standUp(
  code: string,
  actorId: PlayerId,
  targetId: PlayerId,
) {
  let person: Identity | null = null;
  const done = await dispatch(code, (state) => {
    const seat = findPlayer(state, targetId);
    person = seat ? identityOf(seat) : null;
    return { type: "STAND", playerId: actorId, targetId };
  });
  if (person) await getBackend().watchers.add(code, person);
  changed(code);
  return done;
}

/** The host seats `watcherId` in `targetId`'s place; `targetId` takes theirs among the watchers. */
export async function swapSeat(
  code: string,
  hostId: PlayerId,
  targetId: PlayerId,
  watcherId: PlayerId,
) {
  const row = await requireWatcher(code, watcherId);
  let person: Identity | null = null;
  const done = await dispatch(code, (state) => {
    const seat = findPlayer(state, targetId);
    person = seat ? identityOf(seat) : null;
    return {
      type: "SWAP_SEAT",
      playerId: hostId,
      targetId,
      player: row.person,
    };
  });
  const { watchers } = getBackend();
  await watchers.remove(watcherId, code);
  if (person) {
    await watchers.add(code, person);
    await watchers.move(targetId, code, row.position);
  }
  changed(code);
  return done;
}

/** The host has two watchers trade places in the order. */
export async function swapWatchers(
  code: string,
  hostId: PlayerId,
  a: PlayerId,
  b: PlayerId,
) {
  if (a === b) fail("invalid_input");
  await requireHost(code, hostId);
  const [wa, wb] = await Promise.all([
    requireWatcher(code, a),
    requireWatcher(code, b),
  ]);
  const { watchers } = getBackend();
  // equal places (two joined at once) still swap
  const pa = wa.position === wb.position ? wb.position + 0.5 : wb.position;
  await Promise.all([
    watchers.move(a, code, pa),
    watchers.move(b, code, wa.position),
  ]);
  changed(code);
}

/** The host takes someone watching out of the room, for a while or for good. */
export async function kickWatcher(
  code: string,
  hostId: PlayerId,
  targetId: PlayerId,
  ban: boolean,
) {
  await requireWatcher(code, targetId);
  const done = await dispatch(code, () => ({
    type: "KICK",
    playerId: hostId,
    targetId,
    ban,
    watcher: true,
  }));
  await getBackend().watchers.remove(targetId, code);
  changed(code);
  return done;
}

/** The host silences someone here, seated or watching (or lets them talk). */
export async function mute(
  code: string,
  hostId: PlayerId,
  targetId: PlayerId,
  muted: boolean,
) {
  const stored = await loadRoom(code);
  if (!stored) fail("not_found");
  const state = stored.state;
  if (!findPlayer(state, targetId) && !(await watcherIn(code, targetId)))
    fail("not_member");
  return dispatch(code, () => ({
    type: "MUTE",
    playerId: hostId,
    targetId,
    muted,
  }));
}
