"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback } from "react";
import { guestName } from "@/game/guest-names";
import type { Lang } from "@/game/types";

export interface Named {
  isGuest: boolean;
  name: string | null;
  guestNumber: number;
}

/** "Bia", or for guests a random name in the viewer's language: "GatoMaravilhoso" / "WonderfulCat" / "すてきなネコ". */
export function useDisplayName() {
  const t = useTranslations("common");
  const lang = useLocale() as Lang;
  return useCallback(
    (p: Named, isYou = false) => {
      const base =
        !p.isGuest && p.name ? p.name : guestName(p.guestNumber, lang);
      return isYou ? t("youSuffix", { name: base }) : base;
    },
    [t, lang],
  );
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
