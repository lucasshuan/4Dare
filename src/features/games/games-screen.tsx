"use client";

import { ArrowDownAZ, Flame, Search, Sparkles, UsersRound } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentType, useEffect, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { useOnlineByGame } from "@/features/data/use-public-rooms";
import { GameCard } from "@/features/home/game-card";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { ease, riseIn } from "@/lib/motion";
import {
  fromSearch,
  GAME_SORTS,
  type GameFilters,
  type GameSort,
  isFiltered,
  NO_FILTERS,
  PLAYER_COUNTS,
  pickGames,
  toSearch,
} from "./catalog";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const SORT_ICON: Record<GameSort, Icon> = {
  featured: Sparkles,
  popular: Flame,
  name: ArrowDownAZ,
};

/** "any" stands for every table size in the players select. */
const ANY = "any";

/** /games: every game as the hub's tiles, with a search, table size and sort. The filters live in the link. */
export function GamesScreen() {
  const t = useTranslations("home.gamesPage");
  const tn = useTranslations("nav");
  const tg = useTranslations("home.games");
  const locale = useLocale();
  const gameName = useGameName();
  const online = useOnlineByGame();
  useAuthErrorToast();
  // The page is static: it starts with no filter, then takes the link's.
  const [filters, setFilters] = useState(NO_FILTERS);
  const [linked, setLinked] = useState(false);
  const set = (patch: Partial<GameFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  useEffect(() => {
    setFilters(fromSearch(window.location.search));
    setLinked(true);
  }, []);

  // A reload or a shared link opens the same filters.
  useEffect(() => {
    if (!linked) return;
    const next = `${window.location.pathname}${toSearch(filters)}`;
    window.history.replaceState(null, "", next);
  }, [linked, filters]);

  const shown = useMemo(
    () =>
      pickGames(filters, {
        text: (g) => {
          const key = GAME_INFO[g].messages;
          return [gameName(g), tg(`${key}.pitch`)].join(" ");
        },
        name: gameName,
        online,
        locale,
      }),
    [filters, gameName, tg, online, locale],
  );
  const filtered = isFiltered(filters);

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={tn("groups.play")}
        title={t("title")}
        lead={t("lead")}
      />
      <Filters filters={filters} set={set} />
      <div className="mt-[26px] mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2
          aria-live="polite"
          className="font-bold font-display text-[19px] leading-tight tracking-[-0.01em]"
        >
          {t("count", { count: shown.length })}
        </h2>
        {filtered ? (
          <button
            type="button"
            onClick={() => set({ ...NO_FILTERS, sort: filters.sort })}
            className="font-semibold text-[13px] text-sky underline decoration-1 underline-offset-[3px]"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
      {/* square tiles side by side with no gap, as on the hub: two a row on phones, four from there */}
      {shown.length ? (
        <ul className="grid grid-cols-2 gap-[3px] sm:grid-cols-4 sm:gap-0">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((game, i) => (
              <m.li
                key={game}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: ease.soft }}
                className="min-w-0"
              >
                <GameCard
                  game={game}
                  delay={0.1 + i * 0.07}
                  className="w-full"
                />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <m.div
          {...riseIn}
          className="flex flex-col items-center gap-4 rounded-xl border-[1.5px] border-line-strong border-dashed px-6 py-12 text-center"
        >
          <span className="flex size-12 items-center justify-center rounded-pill bg-sunken text-ink-muted">
            <Search className="size-6" strokeWidth={1.75} />
          </span>
          <p className="max-w-sm text-ink-muted">{t("empty")}</p>
          <button
            type="button"
            onClick={() => set({ ...NO_FILTERS, sort: filters.sort })}
            className={buttonClass("secondary", "sm")}
          >
            {t("clearFilters")}
          </button>
        </m.div>
      )}
    </Screen>
  );
}

function Filters({
  filters,
  set,
}: {
  filters: GameFilters;
  set: (patch: Partial<GameFilters>) => void;
}) {
  const t = useTranslations("home.gamesPage");
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-3">
      <SearchField
        value={filters.q}
        onChange={(q) => set({ q })}
        label={t("search")}
        placeholder={t("searchPlaceholder")}
        clearLabel={t("clearSearch")}
      />
      <FilterSelect
        label={t("players")}
        value={filters.players ? String(filters.players) : ANY}
        onChange={(v) => set({ players: v === ANY ? null : Number(v) })}
        options={[
          {
            value: ANY,
            label: t("anyPlayers"),
            icon: <UsersRound className="size-4" strokeWidth={1.75} />,
          },
          ...PLAYER_COUNTS.map((n) => ({
            value: String(n),
            label: t("playersN", { n }),
            icon: <UsersRound className="size-4" strokeWidth={1.75} />,
          })),
        ]}
      />
      <Segmented
        label={t("sort")}
        options={GAME_SORTS}
        value={filters.sort}
        onChange={(sort: GameSort) => set({ sort })}
        render={(s) => {
          const Icon = SORT_ICON[s];
          return (
            <>
              <Icon className="size-4" strokeWidth={1.75} />
              {t(`sorts.${s}`)}
            </>
          );
        }}
      />
    </div>
  );
}
