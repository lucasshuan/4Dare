"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  CalendarDays,
  Flame,
  ImagePlus,
  Link2,
  Quote,
  Sprout,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { GameThumb, useGameName } from "@/features/create/game-info";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import type { ProfileView } from "@/server/contract";
import { ActivityPanel, hours } from "./activity";
import { ContributionsPanel } from "./contributions";
import { streaks } from "./garden-days";
import { profilePath } from "./profile-link";

/** The profile's accent (the XP ring, the tabs, the garden's flowers) and its soft tint. */
export const accentStyle = (accent: string | null) =>
  ({
    "--accent": accent ?? "var(--sky)",
    "--accent-soft": `color-mix(in oklab, ${accent ?? "var(--sky)"} 18%, var(--surface))`,
  }) as CSSProperties;

/** The cover until the person picks one: their avatar's pastel, washing into the accent. */
const bannerStyle = (view: ProfileView): CSSProperties => ({
  background: `linear-gradient(120deg, ${view.avatar.color} 0%, color-mix(in oklab, ${view.avatar.color} 70%, var(--accent)) 60%, color-mix(in oklab, ${view.avatar.color} 45%, var(--accent)) 100%)`,
});

/** How long ago `from` was, in its largest two units: "1 ano e 7 meses". */
function useAge() {
  const t = useTranslations("player.age");
  return (from: number, now: number) => {
    const a = new Date(from);
    const b = new Date(now);
    const months =
      (b.getFullYear() - a.getFullYear()) * 12 +
      (b.getMonth() - a.getMonth()) -
      (b.getDate() < a.getDate() ? 1 : 0);
    if (months < 1)
      return t("days", { n: Math.max(1, Math.floor((now - from) / 864e5)) });
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (!years) return t("months", { n: rest });
    if (!rest) return t("years", { n: years });
    return t("and", {
      a: t("years", { n: years }),
      b: t("months", { n: rest }),
    });
  };
}

const TABS = [
  { value: "activity", Icon: Sprout },
  { value: "contributions", Icon: ImagePlus },
] as const;

/**
 * An account's profile: the cover, who they are (avatar, name, @handle,
 * quote, four numbers, since when), what they play now, then the sections
 * on a rail of tabs (a row on phones).
 */
export function ProfileBody({ view }: { view: ProfileView }) {
  const t = useTranslations("player");
  const format = useFormatter();
  const age = useAge();
  const gameName = useGameName();
  const toast = useToast();
  const locale = useLocale();
  const wide = useMedia("(min-width: 640px)");
  // the time the page was read: the garden and the ages count from it
  const [now] = useState(() => Date.now());
  const streak = useMemo(
    () => streaks(view.plays, now).current,
    [view.plays, now],
  );
  const winRate = view.matches
    ? Math.round((view.wins / view.matches) * 100)
    : 0;

  const copyLink = async () => {
    const url = `${window.location.origin}/${locale}${profilePath(view.handle)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast(t("copied"));
    } catch {
      // the browser refused the clipboard: nothing to tell
    }
  };

  return (
    <div style={accentStyle(view.accent)} className="flex flex-col">
      <div
        className="h-[150px] shrink-0 sm:h-[190px]"
        style={bannerStyle(view)}
      />

      <div className="relative -mt-12 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-3 px-4 sm:-mt-[52px] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5 sm:px-7">
        <span className="rounded-pill bg-canvas p-[5px] shadow-[0_0_0_2px_var(--canvas)]">
          <Avatar
            avatar={view.avatar}
            className="size-20 text-[32px] sm:size-28 sm:text-[44px]"
          />
        </span>
        <div className="flex min-w-0 flex-col gap-1 pb-1">
          <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display font-extrabold text-[30px] leading-none tracking-[-0.02em] sm:text-[40px]">
            <span className="min-w-0 break-words">{view.name}</span>
            <span className="font-medium font-mono text-[15px] text-ink-muted tracking-normal">
              @{view.handle}
            </span>
          </h1>
        </div>
        <div className="col-span-2 flex gap-2 pb-2 sm:col-span-1">
          <Button size="sm" onClick={copyLink}>
            <Link2 strokeWidth={1.75} />
            {t("copyLink")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-4 pt-[18px] sm:px-7">
        {view.quote ? (
          <p className="flex max-w-[52ch] gap-2.5 font-medium text-[17px] leading-snug sm:text-[19px]">
            <Quote
              className="mt-1 size-[18px] shrink-0 text-(--accent)"
              strokeWidth={2}
            />
            {view.quote}
          </p>
        ) : null}
        <dl className="flex flex-wrap gap-1.5">
          <Kpi
            value={format.number(view.matches)}
            label={t("kpis.matches", { n: view.matches })}
          />
          <Kpi value={`${winRate}%`} label={t("kpis.wins")} />
          <Kpi
            value={t("kpis.hoursValue", {
              n: format.number(hours(view.timeMs)),
            })}
            label={t("kpis.hours")}
          />
          <Kpi
            value={
              <>
                <Flame className="size-4 text-apricot" strokeWidth={2} />
                {streak}
              </>
            }
            label={t("kpis.streak")}
          />
        </dl>
        {view.createdAt > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Chip icon={<CalendarDays />}>
              {t("since", {
                date: format.dateTime(view.createdAt, {
                  month: "short",
                  year: "numeric",
                }),
              })}{" "}
              · {age(view.createdAt, now)}
            </Chip>
          </div>
        ) : null}
      </div>

      {view.playing ? (
        <div className="mx-4 mt-[18px] flex flex-wrap items-center gap-3 rounded-xl bg-surface py-2.5 pr-2.5 pl-3.5 sm:mx-7">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-yes-soft px-2.5 py-1 font-bold text-[12px] text-yes uppercase tracking-[0.06em]">
            <span className="size-2 animate-pulse rounded-pill bg-yes" />
            {t("playing")}
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-sm">
            <GameThumb game={view.playing} size="tiny" />
            {gameName(view.playing)}
          </span>
        </div>
      ) : null}

      <Tabs.Root
        defaultValue="activity"
        orientation={wide ? "vertical" : "horizontal"}
        className="mt-[22px] grid border-line border-t sm:grid-cols-[88px_minmax(0,1fr)]"
      >
        <Tabs.List
          aria-label={t("tabsLabel")}
          className="flex gap-1 overflow-x-auto px-3 py-3 max-sm:border-line max-sm:border-b sm:sticky sm:top-0 sm:flex-col sm:self-start sm:px-2.5 sm:py-4"
        >
          {TABS.map(({ value, Icon }) => (
            <Tabs.Tab
              key={value}
              value={value}
              className="group flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 font-semibold text-[13px] text-ink-muted outline-none transition-colors duration-200 ease-soft hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-sky data-active:bg-surface data-active:text-ink data-active:shadow-card sm:flex-col sm:gap-1 sm:px-0.5 sm:pt-2.5 sm:pb-2 sm:text-[11px] sm:leading-tight"
            >
              <Icon
                className="size-[18px] group-data-active:text-(--accent) sm:size-[22px]"
                strokeWidth={1.75}
              />
              {t(`tabs.${value}`)}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Panel value="activity">
          <ActivityPanel view={view} now={now} />
        </Panel>
        <Panel value="contributions">
          <ContributionsPanel view={view} />
        </Panel>
      </Tabs.Root>
    </div>
  );
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Panel
      value={value}
      className="min-w-0 px-4 pt-4 pb-7 outline-none sm:pt-5 sm:pr-7 sm:pl-3"
    >
      {children}
    </Tabs.Panel>
  );
}

function Kpi({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="flex min-w-[76px] flex-col-reverse rounded-lg bg-surface px-3.5 py-2">
      <dt className="font-semibold text-[11.5px] text-ink-muted">{label}</dt>
      <dd className="inline-flex items-center gap-1 font-medium font-mono text-[19px] tabular-nums leading-tight">
        {value}
      </dd>
    </div>
  );
}

export function Chip({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 font-semibold text-[13px] text-ink-muted [&_svg]:size-3.5 [&_svg]:stroke-[1.75]",
      )}
    >
      {icon}
      {children}
    </span>
  );
}
