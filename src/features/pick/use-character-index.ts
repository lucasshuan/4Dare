"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { SearchItem } from "@/game/character-search";
import type { Lang } from "@/game/types";

interface Extras {
  created: SearchItem[];
  images: Record<string, string>;
}

const NO_EXTRAS: Extras = { created: [], images: {} };

/** The library (cached for hours) plus what players created or swapped (cached for seconds). */
async function loadIndex(lang: Lang): Promise<SearchItem[]> {
  const [library, extras] = await Promise.all([
    fetch(`/api/characters/library?lang=${lang}`).then(async (res) => {
      if (!res.ok) throw new Error(`library: ${res.status}`);
      return ((await res.json()) as { items: SearchItem[] }).items;
    }),
    // Without extras the search still works; only new creations are missing.
    fetch(`/api/characters/extras?lang=${lang}`)
      .then((res) => (res.ok ? (res.json() as Promise<Extras>) : NO_EXTRAS))
      .catch(() => NO_EXTRAS),
  ]);
  const items = library.map((item): SearchItem => {
    const swapped = extras.images[item[0]];
    return swapped
      ? [item[0], item[1], item[2], swapped, item[4], item[5]]
      : item;
  });
  return [...items, ...extras.created];
}

const options = (lang: Lang) => ({
  queryKey: ["character-index", lang] as const,
  queryFn: () => loadIndex(lang),
  staleTime: 60_000,
  gcTime: 30 * 60_000,
});

/** The searchable characters of a language, kept in memory once loaded. */
export function useCharacterIndex(lang: Lang, enabled = true) {
  return useQuery({ ...options(lang), enabled });
}

/** Starts the download early (in the lobby), so the search is instant when picking starts. */
export function usePrefetchCharacterIndex(lang: Lang) {
  const client = useQueryClient();
  useEffect(() => {
    void client.prefetchQuery(options(lang));
  }, [client, lang]);
}
