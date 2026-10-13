"use client";

import {
  ArrowDownAZ,
  ChevronLeft,
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
  X,
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
import { Screen } from "@/components/ui/screen";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { LiveDot } from "@/features/current-match/match-lock";
import { useOnlineByGame } from "@/features/data/use-public-rooms";
import { GameCard } from "@/features/home/game-card";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease, riseIn } from "@/lib/motion";
import { GAMES } from "@/lib/routes";
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
      <div className="flex flex-col gap-6">
        <m.div {...riseIn} className="flex flex-col gap-4">
          <Link
            href={GAMES}
            className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("back")}
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
              {t("title")}
            </h1>
            <p className="max-w-[60ch] font-medium text-ink-muted">
              {t("lead")}
            </p>
          </div>
        </m.div>

        <Filters filters={filters} set={set} />

        <div className="flex min-h-8 items-center justify-between gap-4">
          <p
            className="font-semibold text-ink-muted text-sm"
            aria-live="polite"
          >
            {t("count", { count: shown.length })}
          </p>
          <AnimatePresence>
            {filtered ? (
              <m.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => set({ ...NO_FILTERS, sort: filters.sort })}
                className="inline-flex items-center gap-1 font-semibold text-sky text-sm hover:underline"
              >
                <X className="size-4" strokeWidth={2} />
                {t("clearFilters")}
              </m.button>
            ) : null}
          </AnimatePresence>
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
      </div>
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
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.08, duration: 0.4, ease: ease.soft },
      }}
      className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap gap-3">
        <label className="group flex h-13 min-w-64 flex-1 basis-full items-center gap-3 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 transition-colors focus-within:border-sky md:basis-0">
          <Search
            className="size-5 shrink-0 text-ink-muted transition-colors group-focus-within:text-sky"
            strokeWidth={1.75}
          />
          <span className="sr-only">{t("search")}</span>
          <input
            type="search"
            value={filters.q}
            placeholder={t("searchPlaceholder")}
            onChange={(e) => set({ q: e.target.value })}
            className="h-full min-w-0 flex-1 bg-transparent text-base placeholder:text-ink-muted focus-visible:outline-none! [&::-webkit-search-cancel-button]:hidden"
          />
          <AnimatePresence>
            {filters.q ? (
              <m.button
                type="button"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                aria-label={t("clearSearch")}
                onClick={() => set({ q: "" })}
                className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink-muted hover:text-ink"
              >
                <X className="size-4" strokeWidth={2} />
              </m.button>
            ) : null}
          </AnimatePresence>
        </label>
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
        <FilterSelect
          label={t("sort")}
          value={filters.sort}
          onChange={(v) => set({ sort: v as GameSort })}
          options={GAME_SORTS.map((s) => {
            const Icon = SORT_ICON[s];
            return {
              value: s,
              label: t(`sorts.${s}`),
              icon: <Icon className="size-4" strokeWidth={1.75} />,
            };
          })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-semibold text-[11px] text-ink-muted uppercase tracking-[0.08em]">
          {t("style")}
        </span>
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
          className="mx-1 h-6 w-px bg-line-strong max-sm:hidden"
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
      </div>
    </m.div>
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
        "inline-flex h-10 items-center gap-1.5 rounded-pill border-[1.5px] px-3.5 font-semibold text-sm transition-[color,background-color,border-color,transform] duration-200 ease-soft active:scale-95",
        on
          ? "border-sky bg-sky-soft text-ink"
          : "border-line-strong bg-canvas text-ink-muted hover:border-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
