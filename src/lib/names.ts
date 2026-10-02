"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

export interface Named {
  isGuest: boolean;
  name: string | null;
  guestNumber: number;
}

/** "Bia", or "Convidado 27" / "Guest 27" / "ゲスト27" for guests. */
export function useDisplayName() {
  const t = useTranslations("common");
  return useCallback(
    (p: Named, isYou = false) => {
      const base =
        !p.isGuest && p.name
          ? p.name
          : t("guestName", { number: p.guestNumber });
      return isYou ? t("youSuffix", { name: base }) : base;
    },
    [t],
  );
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
