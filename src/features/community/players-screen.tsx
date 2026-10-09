"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { useGameName } from "@/features/create/game-info";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { profilePath } from "@/features/profile/profile-link";
import { Link } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import type {
  PlayersFilter,
  PlayersPage,
  PlayerTile,
} from "@/server/community-contract";
import { LevelFace } from "./rankings-screen";

/**
 * /players: people to play with, searched by name or @handle; everyone,
 * those who played with the reader, or those playing now. Each card shows
 * what its owner lets the reader see; a public room gets a join button.
 */
export function PlayersScreen() {
  const t = useTranslations("community");
  const lang = useLocale();
  const { me } = useMe();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<PlayersFilter>("all");
  const term = useDeferredValue(q);
  const query = useInfiniteQuery({
    queryKey: ["players", lang, term, filter],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<PlayersPage> => {
      const p = new URLSearchParams({ lang, filter });
      if (term.trim()) p.set("q", term.trim());
      if (pageParam) p.set("offset", String(pageParam));
      const res = await fetch(`/api/players?${p}`);
      if (!res.ok) throw new Error(`players: ${res.status}`);
      return (await res.json()) as PlayersPage;
    },
    getNextPageParam: (last) => last.next ?? undefined,
    placeholderData: (prev) => prev,
  });
  const players = query.data?.pages.flatMap((p) => p.players) ?? [];
  const empty =
    filter === "with"
      ? me?.isGuest
        ? t("players.signIn")
        : t("players.emptyWith")
      : filter === "now"
        ? t("players.emptyNow")
        : t("players.empty");
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("players.title")}
        lead={t("players.lead")}
      />
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <label className="flex h-[46px] max-w-[420px] flex-[1_1_260px] items-center gap-2.5 rounded-[16px] border border-line-strong bg-surface px-3.5 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
          <Search className="size-5 text-ink-muted" strokeWidth={1.75} />
          <span className="sr-only">{t("players.searchLabel")}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("players.search")}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
          />
        </label>
        <Segmented
          label={t("players.filter")}
          options={["all", "with", "now"] as const}
          value={filter}
          onChange={setFilter}
          render={(f) => t(`players.${f}`)}
        />
      </div>
      {query.data && players.length === 0 ? (
        <div className="rounded-[24px] border border-line-strong border-dashed p-7 font-bold font-display text-[19px]">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {players.map((p, i) => (
            <Tile key={p.person.id} tile={p} index={i % 30} />
          ))}
          {!query.data
            ? ["a", "b", "c", "d", "e", "f"].map((k) => (
                <span
                  key={k}
                  className="h-[78px] animate-pulse rounded-[20px] bg-sunken"
                />
              ))
            : null}
        </div>
      )}
      {query.hasNextPage ? (
        <div className="flex justify-center py-8">
          <Button
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("players.more")}
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}

function Tile({ tile, index }: { tile: PlayerTile; index: number }) {
  const t = useTranslations("community.players");
  const gameName = useGameName();
  const p = tile.person;
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.soft, delay: index * 0.024 }}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-[20px] border border-line bg-surface p-3.5 transition-[translate,box-shadow] duration-200 ease-soft hover:-translate-y-0.5 hover:shadow-card"
    >
      <Link
        href={profilePath(p.handle)}
        scroll={false}
        className="flex rounded-pill"
      >
        <LevelFace person={p} level={tile.level} size={44} />
      </Link>
      <span className="min-w-0">
        <Link href={profilePath(p.handle)} scroll={false} className="block">
          <b className="block truncate font-bold text-[15px]">{p.name}</b>
          <small className="block truncate text-[12.5px] text-ink-muted">
            @{p.handle}
            {tile.together ? ` · ${t("together", { n: tile.together })}` : ""}
          </small>
        </Link>
        {tile.playing ? (
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-bold text-[12px] text-yes">
              <m.i
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                className="size-2 rounded-pill bg-current"
              />
              {t("playing", { game: gameName(tile.playing.game) })}
            </span>
            {tile.playing.code ? (
              <Link
                href={`/r/${tile.playing.code}`}
                className="inline-flex h-6 items-center rounded-pill bg-ink px-2.5 font-bold text-[11.5px] text-on-ink"
              >
                {t("join")}
              </Link>
            ) : null}
          </span>
        ) : null}
      </span>
    </m.div>
  );
}
