"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { useAction } from "@/lib/hooks/use-action";
import { leaveRoom } from "@/server/actions";
import type { CurrentMatch } from "@/server/contract";

const key = ["current-match"] as const;

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
    refetchInterval: 15_000,
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
      const r = await run(() => leaveRoom(code));
      if (!r.ok) return false;
      client.setQueryData(key, null);
      toast(t("left"));
      return true;
    },
    [run, client, toast, t],
  );
  return { leave, pending };
}
