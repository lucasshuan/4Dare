"use client";

import { Plus, Search } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  type ReactNode,
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { useGameName } from "@/features/create/game-info";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { isTaste, TASTE_KEYS, type Taste } from "@/game/tastes";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import {
  LIBRARY_NEEDS,
  LIBRARY_SORTS,
  type LibraryCard,
  type LibraryCounts,
  type LibraryNeed,
  type LibrarySort,
} from "@/server/community-contract";
import { CharacterCard } from "./character-card";
import { NewCharacter } from "./new-character";
import { TasteChip } from "./taste";
import { type LibraryFilters, useLibrary } from "./use-library";

const oneOf = <T extends string>(list: readonly T[], v: string | null) =>
  (list as readonly string[]).includes(v ?? "") ? (v as T) : null;

/** The filters as the page's link keeps them (?q=&taste=&sort=&need=). */
function readFilters(): LibraryFilters {
  const p = new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const taste = p.get("taste");
  return {
    q: p.get("q") ?? "",
    taste: isTaste(taste) ? taste : null,
    sort: oneOf(LIBRARY_SORTS, p.get("sort")) ?? "top",
    need: oneOf(LIBRARY_NEEDS, p.get("need")),
  };
}

function writeFilters(f: LibraryFilters) {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.taste) p.set("taste", f.taste);
  if (f.sort !== "top") p.set("sort", f.sort);
  if (f.need) p.set("need", f.need);
  const qs = p.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${qs ? `?${qs}` : ""}`,
  );
}

/**
 * /characters: the whole library in the reader's language. Shortcuts to what
 * it still needs (pictures, names in a language, a review), a search by
 * name, work or nickname, an order, the tastes, and the cards, a page at a
 * time as the list scrolls. A card opens its sheet over the list; "New
 * character" opens the form over it too.
 */
export function CharactersScreen() {
  const t = useTranslations("library");
  const format = useFormatter();
  const [filters, setFilters] = useState<LibraryFilters>({
    q: "",
    taste: null,
    sort: "top",
    need: null,
  });
  useEffect(() => setFilters(readFilters()), []);
  const deferredQ = useDeferredValue(filters.q);
  const query = useLibrary({ ...filters, q: deferredQ });
  const [creating, setCreating] = useState<string | null>(null);
  // made here a moment ago: first in the list, with a ring
  const [fresh, setFresh] = useState<LibraryCard[]>([]);

  const update = useCallback((patch: Partial<LibraryFilters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      writeFilters(next);
      return next;
    });
    setFresh([]);
  }, []);

  const pages = query.data?.pages ?? [];
  const first = pages[0];
  const counts = first?.counts;
  const seen = new Set(fresh.map((c) => c.id));
  const cards = [
    ...fresh,
    ...pages.flatMap((p) => p.items).filter((c) => !seen.has(c.id)),
  ];
  const total = first?.total ?? 0;

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

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={t("eyebrow")}
        title={t("title")}
        lead={t("lead", { n: format.number(counts?.all ?? 17000) })}
        actions={
          <Button variant="primary" onClick={() => setCreating("")}>
            <Plus className="size-5" strokeWidth={2} />
            {t("new")}
          </Button>
        }
      />
      <Needs
        counts={counts}
        need={filters.need}
        sort={filters.sort}
        onPick={(pick) =>
          pick === "nopic"
            ? update({ sort: "nopic", need: null })
            : update({ need: filters.need === pick ? null : pick })
        }
      />
      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <label className="flex h-[46px] max-w-[420px] flex-[1_1_260px] items-center gap-2.5 rounded-[16px] border border-line-strong bg-surface px-3.5 transition-[border-color,box-shadow] duration-150 focus-within:border-sky focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--sky)_22%,transparent)]">
          <Search className="size-5 text-ink-muted" strokeWidth={1.75} />
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder={t("search")}
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none"
          />
        </label>
        <Segmented
          label={t("sort.label")}
          options={LIBRARY_SORTS}
          value={filters.sort}
          onChange={(sort: LibrarySort) => update({ sort })}
          render={(s) => (
            <>
              {t(`sort.${s}`)}
              {s === "nopic" && counts ? (
                <span className="font-medium font-mono text-[12px] text-ink-muted">
                  {format.number(counts.nopic)}
                </span>
              ) : null}
            </>
          )}
        />
        <fieldset className="-my-0.5 order-3 m-0 flex min-w-0 flex-[1_1_100%] gap-2 overflow-x-auto border-0 px-0 py-0.5 [scrollbar-width:none]">
          <legend className="sr-only">{t("tastes")}</legend>
          {TASTE_KEYS.map((taste: Taste) => (
            <TasteChip
              key={taste}
              taste={taste}
              on={filters.taste === taste}
              onClick={() =>
                update({ taste: filters.taste === taste ? null : taste })
              }
            />
          ))}
        </fieldset>
      </div>
      <div className="mt-[26px] mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-bold font-display text-[19px] leading-tight tracking-[-0.01em]">
          {first ? t("count", { n: total }) : " "}
        </h2>
        {filters.need ? (
          <button
            type="button"
            onClick={() => update({ need: null })}
            className="font-semibold text-[13px] text-sky underline decoration-1 underline-offset-[3px]"
          >
            {t("clear")}
          </button>
        ) : null}
      </div>
      {query.isError && !first ? (
        <Empty
          title={t("failed")}
          action={
            <Button variant="secondary" onClick={() => void query.refetch()}>
              {t("retry")}
            </Button>
          }
        />
      ) : !first ? (
        <Skeleton />
      ) : cards.length === 0 ? (
        filters.q.trim() ? (
          <Empty
            title={t("empty.search", { q: filters.q.trim() })}
            hint={t("empty.searchHint")}
            action={
              <Button
                variant="primary"
                onClick={() => setCreating(filters.q.trim())}
              >
                <Plus className="size-5" strokeWidth={2} />
                {t("empty.create", { q: filters.q.trim() })}
              </Button>
            }
          />
        ) : (
          <Empty title={t("empty.none")} hint={t("empty.noneHint")} />
        )
      ) : (
        <div
          className={cn(
            "grid grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-[repeat(auto-fill,minmax(152px,1fr))] sm:gap-x-4 sm:gap-y-[22px]",
            query.isPlaceholderData && "opacity-60 transition-opacity",
          )}
        >
          {cards.map((card, i) => (
            <CharacterCard
              key={card.id}
              card={card}
              index={i % 36}
              fresh={seen.has(card.id)}
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
      <NewCharacter
        prefill={creating}
        onClose={() => setCreating(null)}
        onMade={(card) => {
          setFresh((all) => [card, ...all.filter((c) => c.id !== card.id)]);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </Screen>
  );
}

/** The three shortcuts to what the library needs; on phones only the first. */
function Needs({
  counts,
  need,
  sort,
  onPick,
}: {
  counts: LibraryCounts | undefined;
  need: LibraryNeed | null;
  sort: LibrarySort;
  onPick: (pick: "nopic" | LibraryNeed) => void;
}) {
  const t = useTranslations("library.needs");
  const format = useFormatter();
  const locale = useLocale();
  const game = useGameName();
  const langName = (l: Lang) =>
    new Intl.DisplayNames([locale], { type: "language" }).of(l) ?? l;
  const items: {
    key: "nopic" | LibraryNeed;
    n: number | null;
    title: string;
    hint: string;
    on: boolean;
  }[] = [
    {
      key: "nopic",
      n: counts?.nopic ?? null,
      title: t("nopic.title"),
      hint: t("nopic.hint", { game: game("lineup") }),
      on: sort === "nopic",
    },
    ...(counts?.missing
      ? [
          {
            key: "missing" as const,
            n: counts.missing.n,
            title: t("missing.title", { lang: langName(counts.missing.lang) }),
            hint: t("missing.hint", { lang: langName(counts.missing.lang) }),
            on: need === "missing",
          },
        ]
      : []),
    {
      key: "unreviewed",
      n: counts?.unreviewed ?? null,
      title: t("unreviewed.title"),
      hint: t("unreviewed.hint"),
      on: need === "unreviewed",
    },
  ];
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-3">
      {items.map((item, i) => (
        <m.button
          key={item.key}
          type="button"
          aria-pressed={item.on}
          onClick={() => onPick(item.key)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: ease.soft, delay: i * 0.05 }}
          className={cn(
            "flex items-center gap-3 rounded-[20px] border border-dashed px-3.5 py-3 text-left transition-[background-color,translate,border-color] duration-150 ease-soft hover:-translate-y-px hover:bg-surface",
            item.on ? "border-sky bg-sky-soft" : "border-line-strong",
            i > 0 && "max-sm:hidden",
          )}
        >
          <span className="min-w-[2.2ch] shrink-0 font-display font-extrabold text-[26px] leading-none tracking-[-0.02em] tabular-nums">
            {item.n === null ? "…" : format.number(item.n)}
          </span>
          <span className="min-w-0">
            <b className="block text-[14px]">{item.title}</b>
            <small className="block text-[12.5px] text-ink-muted leading-[1.35]">
              {item.hint}
            </small>
          </span>
        </m.button>
      ))}
    </div>
  );
}

function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      <m.div
        key={title}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid justify-items-start gap-3 rounded-[24px] border border-line-strong border-dashed p-7"
      >
        <b className="font-bold font-display text-[20px] leading-tight">
          {title}
        </b>
        {hint ? <span className="text-ink-muted">{hint}</span> : null}
        {action}
      </m.div>
    </AnimatePresence>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-[18px] sm:grid-cols-[repeat(auto-fill,minmax(152px,1fr))] sm:gap-x-4 sm:gap-y-[22px]">
      {Array.from({ length: 12 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders
        <div key={i} className="grid gap-2.5">
          <span className="aspect-[4/5] animate-pulse rounded-[22px] bg-sunken" />
          <span className="h-4 w-3/4 animate-pulse rounded-pill bg-sunken" />
          <span className="h-3 w-1/2 animate-pulse rounded-pill bg-sunken" />
        </div>
      ))}
    </div>
  );
}
