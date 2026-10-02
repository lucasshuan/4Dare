"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { ErrorCode } from "@/game/types";
import type { Result } from "@/server/contract";

/**
 * Runs a server action: tracks "pending", shows the translated error as a toast
 * (except "too_early", which only means a reveal is still on screen) and returns the result.
 */
export function useAction() {
  const t = useTranslations("common.errors");
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async <T>(action: () => Promise<Result<T>>): Promise<Result<T>> => {
      setPending(true);
      try {
        const r = await action();
        if (!r.ok && r.error !== "too_early") toast(t(r.error as ErrorCode));
        return r;
      } catch {
        toast(t("unknown"));
        return { ok: false, error: "unknown" } as const;
      } finally {
        setPending(false);
      }
    },
    [t, toast],
  );
  return { run, pending };
}
