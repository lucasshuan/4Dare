"use client";

import { Tabs } from "@base-ui/react/tabs";
import {
  CalendarDays,
  Flame,
  ImagePlus,
  Link2,
  Lock,
  MessageCircle,
  MoonStar,
  Pencil,
  Quote,
  Sprout,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  type CSSProperties,
  lazy,
  type ReactNode,
  Suspense,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/ui/language-switch";
import { useToast } from "@/components/ui/toast";
import { GameThumb, useGameName } from "@/features/create/game-info";
import type { Banner } from "@/game/profile/profile";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import { useMedia } from "@/lib/hooks/use-media";
import type { ProfileView } from "@/server/contract";
import { ActivityPanel, hours } from "./activity";
import { bannerStyle } from "./banners";
import { ContributionsPanel } from "./contributions";
import { streaks } from "./garden-days";
import { MuralPanel } from "./mural";
import { profilePath } from "./profile-link";
import { Showcase } from "./showcase";

// the editor only loads for the owner, when they open it
const ProfileEditor = lazy(() =>
  import("./profile-editor").then((m) => ({ default: m.ProfileEditor })),
);

/** The profile's accent (the XP ring, the tabs, the garden's flowers) and its soft tint. */
export const accentStyle = (accent: string | null) =>
  ({
    "--accent": accent ?? "var(--sky)",
    "--accent-soft": `color-mix(in oklab, ${accent ?? "var(--sky)"} 18%, var(--surface))`,
  }) as CSSProperties;

/**
 * Where the profile sits: its own page (the cover goes into the page's banner,
 * the whole width under the top bar) or a modal (the cover tops the modal).
 */
export type ProfileMode = "page" | "modal";

/** The side padding and the avatar's overlap of the cover, per mode. */
export const FRAME: Record<
  ProfileMode,
  { root: string; overlap: string; belowCover: string }
> = {
  page: {
    root: "[--pad:0px]",
    overlap: "-mt-[72px] sm:-mt-[84px]",
    belowCover: "sm:pt-[96px]",
  },
  modal: {
    root: "mx-auto w-full max-w-[1080px] [--pad:1rem] sm:[--pad:1.75rem]",
    overlap: "-mt-12 sm:-mt-[52px]",
    belowCover: "sm:pt-16",
  },
};

/**
 * The cover, the whole width: in the page's banner slot (it starts under the
 * floating top bar), or on top of the modal. `children` float over it (the
 * editor's button).
 */
export function ProfileCover({
  banner,
  avatarColor,
  accent,
  mode,
  slot,
  children,
}: {
  banner: Banner | null;
  avatarColor: string;
  accent: string | null;
  mode: ProfileMode;
  slot: HTMLElement | null;
  children?: ReactNode;
}) {
  const cover = (
    <div
      style={{ ...accentStyle(accent), ...bannerStyle(banner, avatarColor) }}
      className={cn(
        "relative w-full shrink-0",
        mode === "page"
          ? "h-[222px] sm:h-[278px] sm:short:h-[262px]"
          : "h-[150px] sm:h-[190px]",
      )}
    >
      {children ? (
        // top right, under the floating bar on the page; the avatar's row covers the bottom
        <div
          className={cn(
            "absolute right-4 flex gap-2 sm:right-8",
            mode === "page"
              ? "top-[72px] sm:top-[96px] sm:short:top-[80px]"
              : "top-4",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
  if (mode === "modal") return cover;
  return slot ? createPortal(cover, slot) : null;
}

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

/** Languages by their names in the reader's language, joined: "português e japonês". */
export function useLangList() {
  const locale = useLocale();
  return (langs: Lang[]) => {
    const names = new Intl.DisplayNames(locale, { type: "language" });
    const text = new Intl.ListFormat(locale, {
      style: "long",
      type: "conjunction",
    }).format(langs.map((l) => names.of(l) ?? l));
    return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
  };
}

/** The profile, or (for its owner, once they ask) the editor in its place. */
export function ProfileBody({
  view,
  mode,
  coverSlot = null,
  startEditing = false,
}: {
  view: ProfileView;
  mode: ProfileMode;
  coverSlot?: HTMLElement | null;
  startEditing?: boolean;
}) {
  const [editing, setEditing] = useState(startEditing && view.isMe);
  if (editing && view.isMe)
    return (
      <Suspense fallback={null}>
        <ProfileEditor
          view={view}
          mode={mode}
          coverSlot={coverSlot}
          onClose={() => setEditing(false)}
        />
      </Suspense>
    );
  return (
    <ProfileShow
      view={view}
      mode={mode}
      coverSlot={coverSlot}
      onEdit={() => setEditing(true)}
    />
  );
}

const TABS = [
  { value: "mural", Icon: MessageCircle },
  { value: "activity", Icon: Sprout },
  { value: "contributions", Icon: ImagePlus },
] as const;

/**
 * An account's profile: the cover, who they are (avatar, name, @handle,
 * quote, four numbers, since when, what they told), the showcase, what they
 * play now, then the sections on a rail of tabs (a row on phones). Parts the
 * owner keeps from this reader don't show.
 */
function ProfileShow({
  view,
  mode,
  coverSlot,
  onEdit,
}: {
  view: ProfileView;
  mode: ProfileMode;
  coverSlot: HTMLElement | null;
  onEdit: () => void;
}) {
  const t = useTranslations("player");
  const format = useFormatter();
  const age = useAge();
  const langList = useLangList();
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
  const tabs = TABS.filter(({ value }) => !view.hidden[value]);

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
      <ProfileCover
        banner={view.banner}
        avatarColor={view.avatar.color}
        accent={view.accent}
        mode={mode}
        slot={coverSlot}
      />
      <div className={cn("flex flex-col", FRAME[mode].root)}>
        <div
          className={cn(
            "relative grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-4 gap-y-3 px-(--pad) sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-5",
            FRAME[mode].overlap,
          )}
        >
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
          <div className="col-span-2 flex flex-wrap gap-2 pb-2 sm:col-span-1">
            {view.isMe ? (
              <Button size="sm" variant="primary" onClick={onEdit}>
                <Pencil strokeWidth={1.75} />
                {t("edit")}
              </Button>
            ) : null}
            <Button size="sm" onClick={copyLink}>
              <Link2 strokeWidth={1.75} />
              {t("copyLink")}
            </Button>
          </div>
        </div>

        {view.hidden.profile ? (
          <div className="mx-(--pad) mt-6 flex items-center gap-3 rounded-xl bg-surface p-5">
            <Lock
              className="size-6 shrink-0 text-ink-muted"
              strokeWidth={1.75}
            />
            <div className="flex flex-col">
              <b className="font-semibold">{t("private")}</b>
              <span className="text-ink-muted text-sm">
                {t("privateText", { name: view.name })}
              </span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-x-8 gap-y-4 px-(--pad) pt-[18px] lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="flex min-w-0 flex-col gap-3.5">
                {view.quote ? (
                  <p className="flex max-w-[52ch] gap-2.5 font-medium text-[17px] leading-snug sm:text-[19px]">
                    <Quote
                      className="mt-1 size-[18px] shrink-0 text-(--accent)"
                      strokeWidth={2}
                    />
                    {view.quote}
                  </p>
                ) : null}
                {view.hidden.activity ? null : (
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
                          <Flame
                            className="size-4 text-apricot"
                            strokeWidth={2}
                          />
                          {streak}
                        </>
                      }
                      label={t("kpis.streak")}
                    />
                  </dl>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {view.createdAt > 0 ? (
                    <Chip icon={<CalendarDays />}>
                      {t("since", {
                        date: format.dateTime(view.createdAt, {
                          month: "short",
                          year: "numeric",
                        }),
                      })}{" "}
                      · {age(view.createdAt, now)}
                    </Chip>
                  ) : null}
                  {view.about.time ? (
                    <Chip icon={<MoonStar />}>
                      {t(`times.${view.about.time}`)}
                    </Chip>
                  ) : null}
                  {view.about.langs.length ? (
                    <Chip
                      icon={
                        <span className="flex">
                          {view.about.langs.map((l, i) => (
                            <Flag
                              key={l}
                              lang={l}
                              className={cn("size-4", i > 0 && "-ml-1.5")}
                            />
                          ))}
                        </span>
                      }
                    >
                      {langList(view.about.langs)}
                    </Chip>
                  ) : null}
                </div>
              </div>
              {view.showcase.length ? (
                <div className="-mx-(--pad) min-w-0 sm:mx-0 lg:-mt-1">
                  <Showcase items={view.showcase} />
                </div>
              ) : null}
            </div>

            {view.playing ? (
              <div className="mx-(--pad) mt-[18px] flex flex-wrap items-center gap-3 rounded-xl bg-surface py-2.5 pr-2.5 pl-3.5">
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

            {tabs.length ? (
              <Tabs.Root
                defaultValue={tabs[0].value}
                orientation={wide ? "vertical" : "horizontal"}
                className="mt-[22px] grid border-line border-t sm:grid-cols-[88px_minmax(0,1fr)]"
              >
                <Tabs.List
                  aria-label={t("tabsLabel")}
                  className="flex gap-1 overflow-x-auto py-3 max-sm:border-line max-sm:border-b max-sm:px-(--pad) sm:sticky sm:top-0 sm:flex-col sm:self-start sm:py-4 sm:pr-2.5 sm:pl-[max(0px,calc(var(--pad)-1rem))]"
                >
                  {tabs.map(({ value, Icon }) => (
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
                {tabs.some((x) => x.value === "mural") ? (
                  <Panel value="mural">
                    <MuralPanel handle={view.handle} />
                  </Panel>
                ) : null}
                {tabs.some((x) => x.value === "activity") ? (
                  <Panel value="activity">
                    <ActivityPanel view={view} now={now} />
                  </Panel>
                ) : null}
                {tabs.some((x) => x.value === "contributions") ? (
                  <Panel value="contributions">
                    <ContributionsPanel view={view} />
                  </Panel>
                ) : null}
              </Tabs.Root>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Panel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <Tabs.Panel
      value={value}
      className="min-w-0 px-(--pad) pt-4 pb-7 outline-none sm:pt-5 sm:pl-3"
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
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface px-3 py-1.5 font-semibold text-[13px] text-ink-muted [&_svg]:size-3.5 [&_svg]:stroke-[1.75]">
      {icon}
      {children}
    </span>
  );
}
