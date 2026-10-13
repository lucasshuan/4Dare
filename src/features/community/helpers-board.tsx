"use client";

import { Select } from "@base-ui/react/select";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Crown } from "lucide-react";
import { m } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { ProfileLink } from "@/features/profile/profile-link";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import type { LibraryHelper, RankingPeriod } from "@/server/community-contract";

/** What the board ranks by: the weighted total or one kind of help. */
type Metric = "total" | "pictures" | "aliases" | "characters" | "live";
const METRICS: readonly Metric[] = [
  "total",
  "pictures",
  "aliases",
  "characters",
  "live",
];

/** How many the board lists, the podium included. */
const SHOWN = 10;

export const MEDAL: Record<string, string> = {
  none: "radial-gradient(circle at 35% 30%, #f2f4f8, #c3cad6)",
  bronze: "radial-gradient(circle at 35% 30%, #f3c9a2, #b8743f)",
  silver: "radial-gradient(circle at 35% 30%, #f2f4f8, #a9b2c2)",
  gold: "radial-gradient(circle at 35% 30%, #fbe7a1, #d6a72c)",
};

/**
 * The places, left to right: second, first, third, as the rankings page's
 * podium: the steps grow one by one, then the faces pop on and the first is crowned.
 */
const PODIUM = [
  { i: 1, height: 112, rise: 0.32 },
  { i: 0, height: 150, rise: 0.46 },
  { i: 2, height: 84, rise: 0.2 },
];

/**
 * Who helped the library most, as a ranking beside the feed: by period, and by what
 * they did (the title is a select). The server sends everyone's counts for
 * the period; the board ranks them by the chosen one.
 */
export function HelpersBoard({
  initial,
}: {
  /** This month's, read on the server; null when that failed. */
  initial: LibraryHelper[] | null;
}) {
  const t = useTranslations("community.contributions");
  const tc = useTranslations("community");
  const lang = useLocale();
  const [period, setPeriod] = useState<RankingPeriod>("month");
  const [metric, setMetric] = useState<Metric>("total");
  const { data, isPlaceholderData } = useQuery({
    queryKey: ["helpers", lang, period],
    queryFn: async (): Promise<LibraryHelper[]> => {
      const p = new URLSearchParams({ lang, period });
      const res = await fetch(`/api/contributions/helpers?${p}`);
      if (!res.ok) throw new Error(`helpers: ${res.status}`);
      return (await res.json()) as LibraryHelper[];
    },
    initialData: () =>
      period === "month" ? (initial ?? undefined) : undefined,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
  const ranked = (data ?? [])
    .filter((h) => h[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || b.total - a.total)
    .slice(0, SHOWN);
  const count = (h: LibraryHelper) =>
    t(`helperCount.${metric}`, { n: h[metric] });
  const top = ranked.slice(0, 3);

  return (
    <section className="grid gap-4 max-lg:row-start-1 lg:sticky lg:top-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <Select.Root
          items={METRICS.map((v) => ({ value: v, label: t(`helpersBy.${v}`) }))}
          value={metric}
          onValueChange={(v) => v && setMetric(v as Metric)}
        >
          <Select.Trigger
            aria-label={t("rankBy")}
            className="group -mx-2 flex min-w-0 items-center gap-1.5 rounded-[12px] px-2 py-1 text-left font-display font-extrabold text-[22px] leading-tight tracking-[-0.01em] transition-colors hover:bg-sunken focus-visible:outline-3 focus-visible:outline-sky"
          >
            <Select.Value>{(v: Metric) => t(`helpersBy.${v}`)}</Select.Value>
            <ChevronDown
              className="size-5 shrink-0 text-ink-muted transition-transform group-data-popup-open:rotate-180"
              strokeWidth={2.5}
            />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              sideOffset={6}
              align="start"
              alignItemWithTrigger={false}
              className="z-50 outline-none"
            >
              <Select.Popup className="min-w-64 origin-[var(--transform-origin)] rounded-lg bg-surface p-1.5 text-ink shadow-pop outline-none transition-[scale,opacity] duration-150 ease-soft data-ending-style:scale-95 data-starting-style:scale-95 data-ending-style:opacity-0 data-starting-style:opacity-0">
                <Select.List>
                  {METRICS.map((v) => (
                    <Select.Item
                      key={v}
                      value={v}
                      className="flex items-center gap-2.5 rounded-md py-2 pr-3 pl-2.5 font-semibold text-sm outline-none select-none data-highlighted:bg-sky-soft"
                    >
                      <Select.ItemText className="flex-1">
                        {t(`helpersBy.${v}`)}
                      </Select.ItemText>
                      <Select.ItemIndicator className="text-sky">
                        <Check className="size-4" strokeWidth={2.25} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <Segmented
          label={tc("rankings.period")}
          options={["week", "month", "ever"] as const}
          value={period}
          onChange={setPeriod}
          render={(p) => tc(`rankings.${p}`)}
        />
      </div>
      {metric === "total" ? (
        <span className="-mt-2 text-[13px] text-ink-muted">
          {t("helperPoints")}
        </span>
      ) : null}
      <div
        className={cn(
          "transition-opacity duration-200",
          isPlaceholderData && "opacity-60",
        )}
      >
        {ranked.length ? (
          <>
            {/* a new top three (or a new ranking) replays the podium */}
            <div
              key={`${metric}-${top.map((h) => h.person.id).join()}`}
              className="mx-auto mt-2 mb-[26px] grid w-full max-w-[480px] grid-cols-3 items-end gap-3"
            >
              {PODIUM.map(({ i, height, rise }) => {
                const h = top[i];
                if (!h) return null;
                return (
                  <ProfileLink
                    key={h.person.id}
                    handle={h.person.handle}
                    style={{ gridColumn: i === 0 ? 2 : i === 1 ? 1 : 3 }}
                    className="grid min-w-0 justify-items-center gap-2 text-center"
                  >
                    <m.span
                      initial={{ opacity: 0, scale: 0.4, y: 14 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 16,
                        delay: rise + 0.22,
                      }}
                      className="grid min-w-0 max-w-full justify-items-center gap-2"
                    >
                      {i === 0 ? (
                        <m.span
                          initial={{ opacity: 0, y: -16, rotate: -40 }}
                          animate={{ opacity: 1, y: 0, rotate: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 11,
                            delay: rise + 0.5,
                          }}
                        >
                          <Crown
                            className="h-[18px] text-gold"
                            strokeWidth={2}
                          />
                        </m.span>
                      ) : null}
                      <Avatar avatar={h.person.avatar} size={48} />
                      <b className="max-w-full truncate font-bold font-display text-[15px] leading-tight">
                        {h.person.name}
                      </b>
                      <small className="font-medium font-mono text-[12px] text-ink-muted">
                        {count(h)}
                      </small>
                    </m.span>
                    <m.div
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                        delay: rise,
                      }}
                      style={{ height }}
                      className={cn(
                        "grid w-full origin-bottom place-items-start justify-center rounded-[18px_18px_8px_8px] border pt-2.5 font-display font-extrabold text-[34px] leading-none",
                        i === 0
                          ? "border-transparent bg-butter text-on-butter"
                          : "border-line bg-surface text-ink-muted",
                      )}
                    >
                      {i + 1}
                    </m.div>
                  </ProfileLink>
                );
              })}
            </div>
            <div className="grid gap-1.5">
              {ranked.slice(3).map((h, i) => (
                <m.div
                  key={h.person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    ease: ease.soft,
                    delay: 0.55 + i * 0.04,
                  }}
                >
                  <ProfileLink
                    handle={h.person.handle}
                    className="grid grid-cols-[36px_34px_minmax(0,1fr)_auto] items-center gap-3 rounded-[16px] bg-surface py-2 pr-3.5 pl-2.5 transition-colors hover:bg-sunken"
                  >
                    <span className="text-center font-medium font-mono text-[14px] text-ink-muted">
                      {i + 4}
                    </span>
                    <Avatar avatar={h.person.avatar} size={34} />
                    <span className="min-w-0">
                      <b className="block truncate font-bold text-[14.5px]">
                        {h.person.name}
                      </b>
                      <small className="block truncate font-medium text-[12px] text-ink-muted">
                        {metric === "total"
                          ? t("helperLine", {
                              pictures: h.pictures,
                              aliases: h.aliases,
                            })
                          : `@${h.person.handle}`}
                      </small>
                    </span>
                    <span className="text-right font-medium font-mono text-[14px] tabular-nums">
                      {count(h)}
                    </span>
                  </ProfileLink>
                </m.div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid justify-items-start gap-2 rounded-[24px] border border-line-strong border-dashed p-7">
            <span className="text-ink-muted">{t("helpersEmpty")}</span>
          </div>
        )}
      </div>
    </section>
  );
}
