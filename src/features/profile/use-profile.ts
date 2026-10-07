"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { PlayerCard, ProfileView } from "@/server/contract";

export const profileKey = (handle: string) => ["profile", handle] as const;

/** An account's profile; `null` when nobody has the handle. */
export function useProfile(handle: string) {
  const lang = useLocale();
  return useQuery({
    queryKey: profileKey(handle),
    queryFn: async (): Promise<ProfileView | null> => {
      const res = await fetch(
        `/api/profiles/${encodeURIComponent(handle)}?lang=${lang}`,
        { cache: "no-store" },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`profile: ${res.status}`);
      return (await res.json()) as ProfileView;
    },
    staleTime: 30_000,
  });
}

/** An account's quick card, fetched when it opens; `null` for a guest. */
export function usePlayerCard(id: string, enabled: boolean) {
  const lang = useLocale();
  return useQuery({
    queryKey: ["player-card", id],
    enabled,
    queryFn: async (): Promise<PlayerCard | null> => {
      const res = await fetch(
        `/api/players/${encodeURIComponent(id)}/card?lang=${lang}`,
        { cache: "no-store" },
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`card: ${res.status}`);
      return (await res.json()) as PlayerCard;
    },
    staleTime: 60_000,
  });
}
