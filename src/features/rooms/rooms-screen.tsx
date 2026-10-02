"use client";

import { ChevronLeft, Globe, Layers, Lock, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GameThumb, useGameName } from "@/features/create/game-field";
import { usePublicRooms } from "@/features/data/use-public-rooms";
import { HubActions } from "@/features/home/hub-actions";
import { DEFAULT_GAME, GAME_KEYS, type GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease, riseIn } from "@/lib/motion";
import { useDisplayName } from "@/lib/names";
import { GAMES, newRoom } from "@/lib/routes";
import { RoomRow, sortRooms } from "./room-row";

export type Access = "all" | "public" | "private";

export interface RoomFilters {
  /** null: every game. */
  game: GameKey | null;
  /** Room name, host name or code; empty: no search. */
  q: string;
  access: Access;
}

/** Case- and accent-insensitive, so "joao" finds "João". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/** The filters as the link carries them: only what differs from "everything". */
function toSearch({ game, q, access }: RoomFilters) {
  const params = new URLSearchParams();
  if (game) params.set("game", game);
  if (q.trim()) params.set("q", q.trim());
  if (access !== "all") params.set("access", access);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** /rooms: every listed room, filtered by game, a search and who can join. The filters live in the link. */
export function RoomsScreen({ initial }: { initial: RoomFilters }) {
  const t = useTranslations("home.roomsPage");
  const name = useDisplayName();
  const { rooms, isLoading } = usePublicRooms();
  const [filters, setFilters] = useState(initial);
  const set = (patch: Partial<RoomFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  // A reload or a shared link opens the same filters.
  useEffect(() => {
    const next = `${window.location.pathname}${toSearch(filters)}`;
    window.history.replaceState(null, "", next);
  }, [filters]);

  const shown = useMemo(() => {
    const q = fold(filters.q);
    return sortRooms(
      rooms.filter(
        (r) =>
          (!filters.game || r.game === filters.game) &&
          (filters.access === "all" ||
            (filters.access === "private") === r.locked) &&
          (!q ||
            fold(r.name).includes(q) ||
            fold(name(r.host)).includes(q) ||
            fold(r.code).includes(q)),
      ),
    );
  }, [rooms, filters, name]);
  const open = shown.filter((r) => r.status === "open").length;
  const filtered = !!(
    filters.game ||
    filters.q.trim() ||
    filters.access !== "all"
  );

  return (
    <Screen right={<HubActions />}>
      <div className="flex flex-col gap-6">
        <motion.div {...riseIn} className="flex flex-col gap-4">
          <Link
            href={GAMES}
            className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            <ChevronLeft className="size-4" strokeWidth={2} />
            {t("back")}
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="font-bold font-display text-[44px] leading-[48px] tracking-[-0.015em]">
                {t("title")}
              </h1>
              <p className="font-medium text-ink-muted" aria-live="polite">
                {isLoading ? " " : t("count", { count: shown.length, open })}
              </p>
            </div>
            <Link
              href={newRoom(filters.game ?? DEFAULT_GAME)}
              className={buttonClass("primary", "md")}
            >
              {t("create")}
            </Link>
          </div>
        </motion.div>

        <Filters filters={filters} set={set} />

        {isLoading ? (
          <div className="grid gap-2 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[68px] animate-pulse rounded-lg bg-surface"
              />
            ))}
          </div>
        ) : shown.length ? (
          <ul className="grid gap-2 md:grid-cols-2">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((r) => (
                <RoomRow
                  key={r.code}
                  room={r}
                  className="bg-surface shadow-card"
                />
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <motion.div
            {...riseIn}
            className="flex flex-col items-center gap-4 rounded-xl border-[1.5px] border-line-strong border-dashed px-6 py-12 text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-pill bg-sunken text-ink-muted">
              <Search className="size-6" strokeWidth={1.75} />
            </span>
            <p className="max-w-sm text-ink-muted">
              {filtered ? t("emptyFiltered") : t("empty")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {filtered ? (
                <button
                  type="button"
                  onClick={() => set({ game: null, q: "", access: "all" })}
                  className={buttonClass("secondary", "sm")}
                >
                  {t("clearFilters")}
                </button>
              ) : null}
              <Link
                href={newRoom(filters.game ?? DEFAULT_GAME)}
                className={buttonClass("primary", "sm")}
              >
                {t("create")}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </Screen>
  );
}

function Filters({
  filters,
  set,
}: {
  filters: RoomFilters;
  set: (patch: Partial<RoomFilters>) => void;
}) {
  const t = useTranslations("home.roomsPage");
  const gameName = useGameName();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.08, duration: 0.4, ease: ease.soft },
      }}
      className="flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-card sm:p-5"
    >
      <label className="group flex h-13 items-center gap-3 rounded-pill border-[1.5px] border-line-strong bg-canvas px-4 transition-colors focus-within:border-sky">
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
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              aria-label={t("clearSearch")}
              onClick={() => set({ q: "" })}
              className="flex size-7 shrink-0 items-center justify-center rounded-pill bg-sunken text-ink-muted hover:text-ink"
            >
              <X className="size-4" strokeWidth={2} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </label>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <FilterGroup label={t("game")}>
          <Chip
            group="game"
            on={filters.game === null}
            onClick={() => set({ game: null })}
            icon={<Layers className="size-4" strokeWidth={1.75} />}
          >
            {t("allGames")}
          </Chip>
          {GAME_KEYS.map((g) => (
            <Chip
              group="game"
              key={g}
              on={filters.game === g}
              onClick={() => set({ game: g })}
              icon={<GameThumb game={g} size="xs" />}
            >
              {gameName(g)}
            </Chip>
          ))}
        </FilterGroup>
        <FilterGroup label={t("access")}>
          {(
            [
              ["all", null],
              [
                "public",
                <Globe key="g" className="size-4" strokeWidth={1.75} />,
              ],
              [
                "private",
                <Lock key="l" className="size-4" strokeWidth={1.75} />,
              ],
            ] as const
          ).map(([a, icon]) => (
            <Chip
              group="access"
              key={a}
              on={filters.access === a}
              onClick={() => set({ access: a })}
              icon={icon}
            >
              {t(`accessOptions.${a}`)}
            </Chip>
          ))}
        </FilterGroup>
      </div>
    </motion.div>
  );
}

/** A labelled row of chips; the label is for screen readers, the chips say enough. */
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-1 rounded-pill border-0 bg-sunken p-1">
      <legend className="sr-only">{label}</legend>
      {children}
    </fieldset>
  );
}

function Chip({
  group,
  on,
  onClick,
  icon,
  children,
}: {
  /** Chips of one group share the sliding highlight. */
  group: string;
  on: boolean;
  onClick: () => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "relative flex h-9 items-center gap-2 rounded-pill px-3.5 font-semibold text-sm transition-colors duration-200",
        on ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {on ? (
        <motion.span
          layoutId={`chip-${group}`}
          className="absolute inset-0 rounded-pill bg-surface shadow-card"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      ) : null}
      {icon ? <span className="relative flex shrink-0">{icon}</span> : null}
      <span className="relative whitespace-nowrap">{children}</span>
    </button>
  );
}
