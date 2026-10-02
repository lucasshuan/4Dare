"use client";

// Tells the browser when a room (or the public room list) changed, so it refetches at once.
// Local mode has no push channel: the screens poll instead, so these are no-ops there.

type Unsubscribe = () => void;

export function subscribeRoom(
  _code: string,
  _onChange: () => void,
): Unsubscribe {
  return () => {};
}

export function subscribeLobby(_onChange: () => void): Unsubscribe {
  return () => {};
}
