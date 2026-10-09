"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { BACKEND } from "@/config";
import type { GameKey } from "@/game/games";
import { useRouter } from "@/i18n/navigation";
import { useAction } from "@/lib/hooks/use-action";
import { GAME_PATHS } from "@/lib/routes";
import { leaveRoom } from "@/server/actions";
import type { CurrentMatch } from "@/server/contract";
import { departRoom, stayInRoom } from "./departing";

const key = ["current-match"] as const;

// No ping says when a match starts or ends for you, so this one polls. With no
// match only your own moves start one (another tab or device: coming back to
// this tab refetches); during one, it ends without you.
const pollMs = (match: CurrentMatch | null | undefined) =>
  BACKEND === "local" ? 15_000 : match ? 30_000 : 60_000;

/** The match you are playing and have not left, if any. Checked now and then: it ends without you. */
export function useCurrentMatch() {
  const lang = useLocale();
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<CurrentMatch | null> => {
      const res = await fetch(`/api/me/match?lang=${lang}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`match: ${res.status}`);
      return ((await res.json()) as { match: CurrentMatch | null }).match;
    },
    refetchInterval: (q) => pollMs(q.state.data),
    staleTime: 5_000,
  });
  return { match: query.data ?? null, isLoading: query.isPending };
}

/** Leaves the current match for good: the seat stays in its history, marked away. */
export function useLeaveMatch() {
  const t = useTranslations("common.currentMatch");
  const toast = useToast();
  const client = useQueryClient();
  const { run, pending } = useAction();
  const leave = useCallback(
    async (code: string) => {
      departRoom(code);
      const r = await run(() => leaveRoom(code));
      if (!r.ok) {
        stayInRoom(code);
        return false;
      }
      client.setQueryData(key, null);
      toast(t("left"));
      return true;
    },
    [run, client, toast, t],
  );
  return { leave, pending };
}

/**
 * Leaves a room where nothing is lost by it (the lobby, the results), then goes
 * to the game's page; the room keeps its screen until that page shows.
 */
export function useLeaveRoom() {
  const router = useRouter();
  const { run, pending } = useAction();
  const leave = useCallback(
    async (code: string, game: GameKey) => {
      departRoom(code);
      await run(() => leaveRoom(code));
      router.push(GAME_PATHS[game]);
    },
    [run, router],
  );
  return { leave, pending };
}
