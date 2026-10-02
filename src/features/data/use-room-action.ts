"use client";

import { useCallback } from "react";
import type { RoomView } from "@/game/types";
import { useAction } from "@/lib/hooks/use-action";
import type { Result } from "@/server/contract";
import { useRoomContext } from "./room-context";

/**
 * Runs a room action and shows the room it returns right away: no second
 * request, and `pending` stays on until the new state is on screen, so a
 * button never flashes back to its old label.
 */
export function useRoomAction() {
  const { run, pending } = useAction();
  const { apply } = useRoomContext();
  const act = useCallback(
    (action: () => Promise<Result<RoomView>>) =>
      run(async () => {
        const r = await action();
        if (r.ok) apply(r.data);
        return r;
      }),
    [run, apply],
  );
  return { act, pending };
}
