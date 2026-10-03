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

/** A room's name, or "<host>'s room" when the host left it unnamed. */
export function useRoomTitle() {
  const t = useTranslations("home.rooms");
  const name = useDisplayName();
  return useCallback(
    (roomName: string, host: Named | undefined) =>
      roomName || (host ? t("roomOf", { name: name(host) }) : ""),
    [t, name],
  );
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The clock's final stretch: the last 20 s, or the last third of a short step (a quick vote). */
export function isLowClock(secondsLeft: number, totalMs: number) {
  return secondsLeft <= Math.min(20, totalMs / 3000);
}
