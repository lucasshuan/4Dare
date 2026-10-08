"use client";

import { useCallback, useState } from "react";
import { useRoomContext } from "@/features/data/room-context";
import { useRoomAction } from "@/features/data/use-room-action";
import type { LineupView } from "@/game/lineup/types";
import type { Beat, RoomView } from "@/game/types";
import type { Result } from "@/server/contract";

/** What every What for? screen reads: the match, its players in seat order, you. */
export function useLineup() {
  const ctx = useRoomContext();
  const lu = ctx.view.lu as LineupView;
  const players = lu.dealtIds.flatMap((id) => {
    const p = ctx.playerById(id);
    return p ? [p] : [];
  });
  return { ...ctx, lu, players };
}

/** A room action that shows the room it returns; the hook's pending covers it. */
export function useLuAction() {
  const { act, pending } = useRoomAction();
  const run = useCallback(
    (action: () => Promise<Result<RoomView>>) => act(action),
    [act],
  );
  return { run, pending };
}

/**
 * How far into `beat` it was when this mounted (ms, on the server clock), so
 * a scene opened late (a reload, a slow phone) starts where everyone is.
 */
export function useBeatAgo(beat: Beat | null) {
  const { serverTime } = useRoomContext();
  const [ago] = useState(() =>
    beat ? Math.max(0, serverTime() - beat.startsAt) : 0,
  );
  return ago;
}

/**
 * A moment `frac` of the way through `beat`, as a delay (s) from when the
 * scene mounted: 0 when it has already come. Beats shrink in e2e runs, so
 * moments are fractions, never milliseconds.
 */
export function beatDelay(beat: Beat, ago: number, frac: number) {
  const at = (beat.until - beat.startsAt) * frac;
  return Math.max(0, (at - ago) / 1000);
}
