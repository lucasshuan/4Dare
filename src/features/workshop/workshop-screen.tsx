"use client";

import { Lightbulb, Search, ShieldCheck } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import {
  type ReactNode,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { WORKSHOP_REVIEW } from "@/lib/routes";
import type { WorkshopItem, WorkshopKind } from "@/server/community-contract";
import { Sema } from "./objects";
import { Suggest } from "./suggest";
import {
  useWorkshop,
  useWorkshopItem,
  type WorkshopFilters,
} from "./use-workshop";
import { WorkshopCard } from "./workshop-card";

type Tab = WorkshopKind | "all";
type Status = WorkshopFilters["status"];

const TABS: readonly Tab[] = ["all", "theme", "question", "mission"];
const STATUSES: readonly Status[] = ["voting", "live", "refused"];

/** Whether a game uses a kind at all (the tab hides when it doesn't). */
const fits = (kind: Tab, game: GameKey | null) =>
  kind === "all" ||
  !game ||
  (kind === "theme" && (game === "who-am-i" || game === "impostor")) ||
  (kind === "question" && game === "impostor") ||
  (kind === "mission" && game === "lineup");

const ART: Record<GameKey, string> = {
  "who-am-i": "var(--art-whoami)",
  impostor: "var(--art-impostor)",
  lineup: "var(--art-lineup)",
};

/**
 * /workshop: the themes, questions and missions the games use. A game
 * filter, "only mine", tabs by kind and a traffic light by status (up for
 * votes, live, left out), then the cards. "Suggest" opens the composer;
 * curators get the review queue. `focus` (a shared link) puts one card first.
 */
export function WorkshopScreen({ focus = null }: { focus?: string | null }) {
  const t = useTranslations("workshop");
  const format = useFormatter();
  const gameName = useGameName();
  const [filters, setFilters] = useState<WorkshopFilters>({
    game: null,
    kind: null,
    status: "voting",
    mine: false,
    q: "",
  });
  const q = useDeferredValue(filters.q);
  const query = useWorkshop({ ...filters, q });
  const focused = useWorkshopItem(focus);
  const [composing, setComposing] = useState(false);
  const [made, setMade] = useState<string | null>(null);

  // a shared link opens on its card's own tab
  const opened = useRef(false);
  useEffect(() => {
    const item = focused.data;
    if (!item || opened.current) return;
    opened.current = true;
    setFilters((f) => ({
      ...f,
      status: item.status === "review" ? "voting" : item.status,
      kind: null,
      game: null,
    }));
  }, [focused.data]);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const pinned: WorkshopItem[] = focused.data ? [focused.data] : [];
  const items = [
    ...pinned,
    ...pages.flatMap((p) => p.items).filter((i) => i.id !== focused.data?.id),
  ].filter(
    (i) =>
      i === focused.data ||
      (i.status === "review" ? "voting" : i.status) === filters.status,
  );
  const set = (patch: Partial<WorkshopFilters>) =>
    setFilters((f) => {
      const next = { ...f, ...patch };
      if (next.kind && !fits(next.kind, next.game)) next.kind = null;
      return next;
    });
  const tab: Tab = filters.kind ?? "all";
  const count = (kind: Tab, status: Status) =>
    first
      ? kind === "all"
        ? (["theme", "question", "mission"] as const)
            .filter((k) => fits(k, filters.game))
            .reduce((a, k) => a + first.counts[k][status], 0)
        : first.counts[kind][status]
      : null;
  const tabTotal = (kind: Tab) =>
    STATUSES.reduce((a, s) => a + (count(kind, s) ?? 0), 0);

  const more = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = more.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage)
          void fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const suggestKind: WorkshopKind =
    filters.kind ?? (filters.game === "lineup" ? "mission" : "theme");

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead")}
        actions={
          <>
            {first?.curator ? (
              <Link
                href={WORKSHOP_REVIEW}
                className={buttonClass("ghost", "md")}
              >
                <ShieldCheck className="size-5" strokeWidth={1.75} />
                {t("review")}
              </Link>
            ) : null}
            <Button variant="primary" onClick={() => setComposing(true)}>
              <Lightbulb className="size-5" strokeWidth={2} />
              {t("suggest")}
            </Button>
          </>
        }
      />
      <div className="mb-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2.5">
        <fieldset className="-mx-1 m-0 flex min-w-0 flex-1 gap-2 overflow-x-auto border-0 px-1 py-0.5 [scrollbar-width:none]">
          <legend className="sr-only">{t("gameLabel")}</legend>
          <GameChoice
            on={!filters.game}
            onClick={() => set({ game: null })}
            art={
              <span className="grid grid-cols-3 gap-[3px]">
                {OPEN_GAMES.map((g) => (
                  <i
                    key={g}
                    style={{ background: ART[g] }}
                    className="size-2.5 rounded-[4px]"
                  />
                ))}
              </span>
            }
          >
            {t("games.all")}
          </GameChoice>
          {OPEN_GAMES.map((g) => (
            <GameChoice
              key={g}
              on={filters.game === g}
              onClick={() => set({ game: g })}
              art={<GameThumb game={g} size="xs" />}
            >
              {gameName(g)}
            </GameChoice>
          ))}
        </fieldset>
        {/* biome-ignore lint/a11y/noLabelWithoutControl: the switch is inside */}
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 font-semibold text-[14px]">
          <Switch
            checked={filters.mine}
            onCheckedChange={(mine) => set({ mine })}
            aria-label={t("mine")}
          />
          {t("mine")}
        </label>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label={t("tabs.label")}
          options={TABS.filter((k) => fits(k, filters.game))}
          value={tab}
          onChange={(k: Tab) => set({ kind: k === "all" ? null : k })}
          render={(k) => (
            <>
              {t(`tabs.${k}`)}
              {first ? (
                <span className="font-medium font-mono text-[12px] text-ink-muted max-sm:hidden">
                  {format.number(tabTotal(k))}
                </span>
              ) : null}
            </>
          )}
        />
        <Segmented
          label={t("status.label")}
          options={STATUSES}
          value={filters.status}
          onChange={(status: Status) => set({ status })}
          render={(s) => (
            <>
              <Sema status={s} />
              <span className="max-sm:hidden">{t(`status.${s}`)}</span>
              <span className="sm:hidden">
                {s === "voting"
                  ? t("status.votingShort")
                  : s === "refused"
                    ? t("status.refusedShort")
                    : t("status.live")}
              </span>
              {first ? (
                <span className="font-medium font-mono text-[12px] text-ink-muted">
                  {format.number(count(tab, s) ?? 0)}
                </span>
              ) : null}
            </>
          )}
        />
      </div>
      <AnimatePresence initial={false}>
        {filters.status === "live" ? (
          <m.div
            key="search"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <label className="mb-5 flex h-[46px] max-w-[420px] items-center gap-2.5 rounded-[16px] border border-line-strong bg-surface px-3.5 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
              <Search className="size-5 text-ink-muted" strokeWidth={1.75} />
              <span className="sr-only">{t("searchLabel")}</span>
              <input
                type="search"
                value={filters.q}
                onChange={(e) => set({ q: e.target.value })}
                placeholder={t("search")}
                autoComplete="off"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
              />
            </label>
          </m.div>
        ) : null}
      </AnimatePresence>
      {!first ? (
        <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
          {["a", "b", "c", "d", "e", "f"].map((k) => (
            <span
              key={k}
              className="h-[260px] animate-pulse rounded-[24px] bg-sunken"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty status={filters.status} onSuggest={() => setComposing(true)} />
      ) : (
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(270px,1fr))]",
            query.isPlaceholderData && "opacity-60 transition-opacity",
          )}
        >
          {items.map((item, i) => (
            <WorkshopCard
              key={item.id}
              item={item}
              index={i % 24}
              flash={item.id === made || item === focused.data}
            />
          ))}
        </div>
      )}
      <div ref={more} className="flex justify-center py-8">
        {hasNextPage ? (
          <Button
            variant="secondary"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {t("more")}
          </Button>
        ) : null}
      </div>
      <Suggest
        open={composing}
        kind={suggestKind}
        left={first?.left ?? null}
        onClose={() => setComposing(false)}
        onSent={(id, kind) => {
          setMade(id);
          setFilters((f) => ({
            ...f,
            status: "voting",
            mine: false,
            game: null,
            kind: f.kind ? kind : null,
          }));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </Screen>
  );
}

function GameChoice({
  on,
  onClick,
  art,
  children,
}: {
  on: boolean;
  onClick: () => void;
  art: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-[52px] shrink-0 items-center gap-2.5 rounded-[18px] border py-0 pr-4 pl-2 font-semibold text-[15px] transition-[background-color,border-color,color,translate,box-shadow] duration-150 ease-soft hover:-translate-y-px hover:shadow-card active:scale-[0.97]",
        on
          ? "border-ink bg-ink text-on-ink"
          : "border-line bg-surface text-ink",
      )}
    >
      <span className="flex min-w-9 justify-center">{art}</span>
      {children}
    </button>
  );
}

function Empty({
  status,
  onSuggest,
}: {
  status: Status;
  onSuggest: () => void;
}) {
  const t = useTranslations("workshop");
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: ease.soft }}
      className="grid justify-items-start gap-2.5 rounded-[24px] border border-line-strong border-dashed p-7"
    >
      <b className="font-bold font-display text-[19px] leading-tight">
        {status === "voting"
          ? t("empty.voting")
          : t("empty.other", { status: t(`status.${status}`) })}
      </b>
      <span className="text-ink-muted">{t("empty.hint")}</span>
      <Button variant="primary" onClick={onSuggest}>
        <Lightbulb className="size-5" strokeWidth={2} />
        {t("suggest")}
      </Button>
    </m.div>
  );
}
