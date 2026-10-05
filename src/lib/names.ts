"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { Me } from "@/server/contract";

/**
 * Someone as the server sends them: `name` is ready, an account's own or a
 * guest's in the page's language ("GatoMaravilhoso" / "WonderfulCat" / "すてきなネコ").
 */
export interface Named {
  name: string;
}

/** The signed-in person by name: an account's own, else their guest name. */
export const meNamed = (me: Me): Named => ({
  name: !me.isGuest && me.name ? me.name : me.guestName,
});

/** Their name, with "(you)" when it is the reader. */
export function useDisplayName() {
  const t = useTranslations("common");
  return useCallback(
    (p: Named, isYou = false) =>
      isYou ? t("youSuffix", { name: p.name }) : p.name,
    [t],
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
