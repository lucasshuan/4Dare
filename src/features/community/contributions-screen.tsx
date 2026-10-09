"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { m } from "motion/react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { useWithNames } from "@/components/ui/player-name";
import { Portrait } from "@/components/ui/portrait";
import { Screen } from "@/components/ui/screen";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { useMe } from "@/features/data/use-me";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { Sema } from "@/features/workshop/objects";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { characterPath, workshopPath } from "@/lib/routes";
import type {
  ContributionItem,
  ContributionsPage,
  FeedFilter,
} from "@/server/community-contract";

const FILTERS: readonly FeedFilter[] = [
  "all",
  "picture",
  "alias",
  "character",
  "suggestion",
];

const MEDAL: Record<string, string> = {
  none: "radial-gradient(circle at 35% 30%, #f2f4f8, #c3cad6)",
  bronze: "radial-gradient(circle at 35% 30%, #f3c9a2, #b8743f)",
  silver: "radial-gradient(circle at 35% 30%, #f2f4f8, #a9b2c2)",
  gold: "radial-gradient(circle at 35% 30%, #fbe7a1, #d6a72c)",
};

/**
 * /contributions: what the community put into the library and the Workshop,
 * newest first, by day. On top, the reader's own numbers and how far their
 * pictures badge is; a filter by kind and "only mine".
 */
export function ContributionsScreen() {
  const t = useTranslations("community.contributions");
  const tc = useTranslations("community");
  const tBadges = useTranslations("profile.badges");
  const format = useFormatter();
  const lang = useLocale();
  const now = useNow({ updateInterval: 60_000 });
  const { me } = useMe();
  const [kind, setKind] = useState<FeedFilter>("all");
  const [mine, setMine] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ["contributions", lang, kind, mine],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ContributionsPage> => {
      const p = new URLSearchParams({ lang, kind });
      if (mine) p.set("mine", "1");
      if (pageParam) p.set("before", String(pageParam));
      const res = await fetch(`/api/contributions?${p}`);
      if (!res.ok) throw new Error(`contributions: ${res.status}`);
      return (await res.json()) as ContributionsPage;
    },
    getNextPageParam: (last) => last.next ?? undefined,
    placeholderData: (prev) => prev,
  });
  const first = query.data?.pages[0];
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const mineNums = first?.mine;

  const dayOf = (at: number) => {
    const d = new Date(at);
    const today = new Date(now);
    const start = (x: Date) =>
      new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((start(today) - start(d)) / 86_400_000);
    return diff === 0
      ? t("today")
      : diff === 1
        ? t("yesterday")
        : format.dateTime(at, {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
  };

  let lastDay = "";
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead eyebrow={tc("eyebrow")} title={t("title")} lead={t("lead")} />
      {mineNums ? (
        <div className="mb-2 grid max-w-[760px] gap-3">
          <div className="grid grid-cols-3 gap-3">
            {(["pictures", "aliases", "suggestions"] as const).map((k, i) => (
              <m.div
                key={k}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: ease.soft, delay: i * 0.05 }}
                className="grid gap-0.5 rounded-[20px] bg-surface px-4 py-3.5"
              >
                <b className="font-display font-extrabold text-[28px] leading-none tracking-[-0.02em] tabular-nums">
                  {format.number(mineNums[k])}
                </b>
                <small className="text-[13px] text-ink-muted">
                  {t(`kpi.${k}`)}
                </small>
              </m.div>
            ))}
          </div>
          <div className="flex items-center gap-3 rounded-[20px] bg-sunken px-4 py-3 text-[13.5px]">
            <m.span
              aria-hidden="true"
              initial={{ rotate: -30, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: ease.soft }}
              style={{ background: MEDAL[mineNums.badge.tier ?? "none"] }}
              className="size-[34px] shrink-0 rounded-pill shadow-[inset_0_-3px_0_rgb(0_0_0/0.15)]"
            />
            <span className="min-w-0">
              <b>
                {mineNums.badge.tier
                  ? t("badge", {
                      name: tBadges("names.pictures"),
                      tier: tBadges(`tiers.${mineNums.badge.tier}`),
                    })
                  : tBadges("names.pictures")}
              </b>
              <br />
              <span className="text-ink-muted">
                {mineNums.badge.next === null
                  ? t("maxed")
                  : t("toNext", {
                      n: mineNums.badge.next - mineNums.badge.value,
                    })}
              </span>
            </span>
            {mineNums.badge.next !== null ? (
              <>
                <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-line">
                  <m.i
                    className="block h-full rounded-pill bg-sky"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (mineNums.badge.value / mineNums.badge.next) * 100)}%`,
                    }}
                    transition={{ duration: 0.8, ease: ease.soft }}
                  />
                </span>
                <span className="font-medium font-mono text-[13px] tabular-nums">
                  {mineNums.badge.value}/{mineNums.badge.next}
                </span>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="mt-3.5 mb-[18px] flex flex-wrap items-center gap-3">
        <Segmented
          label={t("filter")}
          options={FILTERS}
          value={kind}
          onChange={setKind}
          render={(k) => t(k)}
        />
        {me && !me.isGuest ? (
          // biome-ignore lint/a11y/noLabelWithoutControl: the switch is inside
          <label className="inline-flex cursor-pointer items-center gap-2.5 font-semibold text-[14px]">
            <Switch
              checked={mine}
              onCheckedChange={setMine}
              aria-label={t("mine")}
            />
            {t("mine")}
          </label>
        ) : null}
      </div>
      <div
        className={cn(
          "grid max-w-[760px] gap-1",
          query.isPlaceholderData && "opacity-60 transition-opacity",
        )}
      >
        {query.data && items.length === 0 ? (
          <div className="grid justify-items-start gap-2 rounded-[24px] border border-line-strong border-dashed p-7">
            <b className="font-bold font-display text-[19px]">{t("empty")}</b>
            <span className="text-ink-muted">{t("emptyHint")}</span>
          </div>
        ) : null}
        {!query.data
          ? ["a", "b", "c", "d"].map((k) => (
              <span
                key={k}
                className="h-[60px] animate-pulse rounded-[18px] bg-sunken"
              />
            ))
          : null}
        {items.map((item, i) => {
          const day = dayOf(item.at);
          const head = day !== lastDay;
          lastDay = day;
          return (
            <div key={item.id} className="grid gap-1">
              {head ? (
                <div className="px-1 pt-4 pb-1.5 font-semibold text-[12px] text-ink-muted uppercase tracking-[0.08em]">
                  {day}
                </div>
              ) : null}
              <Line item={item} index={i % 30} now={now} />
            </div>
          );
        })}
      </div>
      {query.hasNextPage ? (
        <div className="flex justify-center py-8">
          <Button
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {t("more")}
          </Button>
        </div>
      ) : null}
    </Screen>
  );
}

function Line({
  item,
  index,
  now,
}: {
  item: ContributionItem;
  index: number;
  now: Date;
}) {
  const t = useTranslations("community.contributions");
  const format = useFormatter();
  const withNames = useWithNames();
  const c = item.character;
  const s = item.suggestion;
  const text = withNames((n) => {
    const name = n(item.by);
    const character = c?.name ?? "";
    if (item.kind === "picture") return t("lines.picture", { name, character });
    if (item.kind === "character")
      return t("lines.character", { name, character });
    if (item.kind === "alias")
      return item.alias?.edited
        ? t("lines.aliasEdit", {
            name,
            character,
            alias: item.alias.name,
            before: item.alias.before ?? "",
          })
        : t("lines.alias", { name, character, alias: item.alias?.name ?? "" });
    if (s && item.kind === "live")
      return t(`lines.live.${s.kind}`, { name, title: s.title });
    return t(`lines.suggestion.${s?.kind ?? "theme"}`, {
      name,
      title: s?.title ?? "",
    });
  });
  const thumb: ReactNode = c ? (
    <span className="block w-[38px] overflow-hidden rounded-[10px]">
      <Portrait src={c.imageUrl} className="rounded-none" />
    </span>
  ) : s ? (
    <Sema status={item.kind === "live" ? "live" : s.status} large />
  ) : null;
  const href = c ? characterPath(c.id) : s ? workshopPath(s.id) : null;
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ease.soft, delay: index * 0.028 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] bg-surface px-3 py-2.5"
    >
      <p className="text-[14.5px] leading-[1.4]">
        {text}
        <small className="block text-[12.5px] text-ink-muted">
          {format.relativeTime(item.at, now)}
        </small>
      </p>
      {href ? (
        <Link
          href={href}
          scroll={false}
          className="flex rounded-[10px] transition-transform hover:scale-105"
        >
          {thumb}
        </Link>
      ) : (
        thumb
      )}
    </m.div>
  );
}
