"use client";

import {
  ArrowDownAZ,
  Flame,
  Gavel,
  Lightbulb,
  MessageCircleQuestionMark,
  ScanSearch,
  Search,
  Sparkles,
  UsersRound,
  VenetianMask,
  Vote,
} from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import {
  type ComponentType,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { buttonClass } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-select";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { LiveDot } from "@/features/current-match/match-lock";
import { useOnlineByGame } from "@/features/data/use-public-rooms";
import { GameCard } from "@/features/home/game-card";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import type { GameKey } from "@/game/games";
import { cn } from "@/lib/cn";
import { ease, riseIn } from "@/lib/motion";
import {
  fromSearch,
  GAME_SORTS,
  GAME_TAGS,
  type GameFilters,
  type GameSort,
  type GameTag,
  isFiltered,
  NO_FILTERS,
  PLAYER_COUNTS,
  pickGames,
  TAGS_OF,
  toSearch,
} from "./catalog";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

const TAG_ICON: Record<GameTag, Icon> = {
  deduction: ScanSearch,
  bluff: VenetianMask,
  questions: MessageCircleQuestionMark,
  voting: Vote,
  auction: Gavel,
  creative: Lightbulb,
};

const SORT_ICON: Record<GameSort, Icon> = {
  featured: Sparkles,
  popular: Flame,
  name: ArrowDownAZ,
};

/** "any" stands for every table size in the players select. */
const ANY = "any";

/** /games: every game as the hub's tiles, with a search, table size, style and who is playing. The filters live in the link. */
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
          return [
            gameName(g),
            tg(`${key}.pitch`),
            ...TAGS_OF[g].map((tag) => t(`tags.${tag}`)),
          ].join(" ");
        },
        name: gameName,
        online,
        locale,
      }),
    [filters, gameName, tg, t, online, locale],
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
      {shown.length ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-x-5 sm:gap-y-9">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((game, i) => (
              <m.li
                key={game}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: ease.soft }}
                className="flex min-w-0 flex-col gap-3"
              >
                <GameCard
                  game={game}
                  delay={0.1 + i * 0.07}
                  className="w-full"
                  tileClassName="rounded-xl shadow-card"
                />
                <GameInfo game={game} picked={filters.tags} />
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

/** Under a tile: its name, table size and pitch (wider screens; a phone's tile shows its name), then its styles, the picked ones lit. */
function GameInfo({ game, picked }: { game: GameKey; picked: GameTag[] }) {
  const t = useTranslations("home.gamesPage");
  const key = GAME_INFO[game].messages;
  const tg = useTranslations(`home.games.${key}`);
  return (
    <div className="flex flex-col gap-2 px-0.5">
      <div className="flex items-baseline justify-between gap-3 max-sm:hidden">
        <h2 className="truncate font-display font-extrabold text-xl tracking-[-0.01em]">
          {tg("name")}
        </h2>
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink-muted text-xs">
          <UsersRound className="size-3.5" strokeWidth={2} />
          {tg("players")}
        </span>
      </div>
      <p className="line-clamp-2 text-ink-muted text-sm leading-5 max-sm:hidden">
        {tg("pitch")}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {TAGS_OF[game].map((tag) => {
          const Icon = TAG_ICON[tag];
          const on = picked.includes(tag);
          return (
            <li
              key={tag}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-pill px-2 font-semibold text-[12px] transition-colors duration-200",
                on ? "bg-sky-soft text-ink" : "bg-sunken text-ink-muted",
              )}
            >
              <Icon className="size-3.5" strokeWidth={2} />
              {t(`tags.${tag}`)}
            </li>
          );
        })}
      </ul>
    </div>
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
  const toggle = (tag: GameTag) =>
    set({
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((x) => x !== tag)
        : GAME_TAGS.filter((x) => x === tag || filters.tags.includes(x)),
    });
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
      <fieldset className="-my-0.5 order-3 m-0 flex min-w-0 flex-[1_1_100%] gap-2 overflow-x-auto border-0 px-0 py-0.5 [scrollbar-width:none]">
        <legend className="sr-only">{t("style")}</legend>
        {GAME_TAGS.map((tag) => {
          const Icon = TAG_ICON[tag];
          return (
            <Chip
              key={tag}
              on={filters.tags.includes(tag)}
              onClick={() => toggle(tag)}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {t(`tags.${tag}`)}
            </Chip>
          );
        })}
        <span
          aria-hidden="true"
          className="mx-1 h-6 w-px shrink-0 self-center bg-line-strong"
        />
        <Chip
          on={filters.online}
          onClick={() => set({ online: !filters.online })}
        >
          <span className="flex size-4 items-center justify-center">
            {filters.online ? (
              <LiveDot />
            ) : (
              <span className="size-2 rounded-full bg-current opacity-50" />
            )}
          </span>
          {t("online")}
        </Chip>
      </fieldset>
    </div>
  );
}

/** A filter that turns on and off. */
function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill border px-3.5 font-semibold text-sm transition-[background-color,border-color,color,scale] duration-150 ease-soft active:scale-[0.96]",
        on
          ? "border-transparent bg-sky-soft text-ink shadow-[inset_0_0_0_1.5px_var(--sky)]"
          : "border-line bg-surface hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
