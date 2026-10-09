"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { Taste } from "@/game/tastes";
import type {
  AliasHistoryEntry,
  CharacterSheet,
  LibraryNeed,
  LibraryPage,
  LibrarySort,
} from "@/server/community-contract";
import type { TrayPicture } from "@/server/pictures";

export interface LibraryFilters {
  q: string;
  taste: Taste | null;
  sort: LibrarySort;
  need: LibraryNeed | null;
}

async function json<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return (await res.json()) as T;
}

/** The characters page's list, a page at a time. */
export function useLibrary(filters: LibraryFilters) {
  const lang = useLocale();
  return useInfiniteQuery({
    queryKey: ["library", lang, filters],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ lang, sort: filters.sort });
      if (filters.q.trim()) p.set("q", filters.q.trim());
      if (filters.taste) p.set("taste", filters.taste);
      if (filters.need) p.set("need", filters.need);
      if (pageParam) p.set("offset", String(pageParam));
      return json<LibraryPage>(`/api/characters/browse?${p}`);
    },
    getNextPageParam: (last) => last.next ?? undefined,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });
}

/** Up to three characters whose name is like `q` (the new character's look-alikes). */
export function useLookAlikes(q: string) {
  const lang = useLocale();
  const term = q.trim();
  return useQuery({
    queryKey: ["library-alike", lang, term],
    enabled: term.length >= 2,
    queryFn: () =>
      json<LibraryPage>(
        `/api/characters/browse?${new URLSearchParams({ lang, q: term })}`,
      ),
    select: (page) => page.items.slice(0, 3),
    staleTime: 30_000,
  });
}

export const sheetKey = (id: string, lang: string) =>
  ["character-sheet", id, lang] as const;

export function useSheet(id: string) {
  const lang = useLocale();
  return useQuery({
    queryKey: sheetKey(id, lang),
    queryFn: () =>
      json<CharacterSheet>(
        `/api/characters/${encodeURIComponent(id)}/sheet?lang=${lang}`,
      ),
    retry: (n, e) => !String(e).includes(": 404") && n < 2,
  });
}

export function usePictures(id: string) {
  const lang = useLocale();
  return useQuery({
    queryKey: ["character-pictures", id],
    queryFn: () =>
      json<{ pictures: TrayPicture[] }>(
        `/api/characters/${encodeURIComponent(id)}/pictures?lang=${lang}`,
      ).then((r) => r.pictures),
  });
}

export function useAliasHistory(id: string, enabled: boolean) {
  const lang = useLocale();
  return useQuery({
    queryKey: ["alias-history", id, lang],
    enabled,
    queryFn: () =>
      json<{ history: AliasHistoryEntry[] }>(
        `/api/characters/${encodeURIComponent(id)}/history?lang=${lang}`,
      ).then((r) => r.history),
  });
}

/** After a change on a sheet: it, its pictures, the list and the history read again. */
export function useRefreshCharacter() {
  const client = useQueryClient();
  return (id: string) => {
    void client.invalidateQueries({ queryKey: ["character-sheet", id] });
    void client.invalidateQueries({ queryKey: ["character-pictures", id] });
    void client.invalidateQueries({ queryKey: ["alias-history", id] });
    void client.invalidateQueries({ queryKey: ["library"] });
  };
}
