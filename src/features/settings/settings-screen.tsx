"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { cn } from "@/lib/cn";
import {
  GamePane,
  LanguagePane,
  LookPane,
  SETTINGS_PARTS,
  SoundPane,
} from "./settings-dialog";

type Part = (typeof SETTINGS_PARTS)[number]["value"];

const IDS = SETTINGS_PARTS.map((p) => p.value);

const PANES: Record<Part, () => ReactNode> = {
  sound: SoundPane,
  look: LookPane,
  game: GamePane,
  language: LanguagePane,
};

/**
 * /settings: the settings box's parts as one page, a section each, with an
 * index beside them (chips over them on phones) that marks the part in view.
 * The part in view goes into the address (#look), so a reload (a new
 * language) comes back to it.
 */
export function SettingsScreen() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const current = useInView(IDS);
  useEffect(() => {
    if (!current) return;
    const url = new URL(window.location.href);
    const hash = current === IDS[0] ? "" : `#${current}`;
    if (url.hash === hash) return;
    url.hash = hash;
    window.history.replaceState(window.history.state, "", url);
  }, [current]);
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead
        eyebrow={tNav("groups.you")}
        title={t("title")}
        lead={t("lead")}
      />
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-[200px_minmax(0,760px)]">
        <nav
          aria-label={t("jump")}
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:p-0"
        >
          {SETTINGS_PARTS.map(({ value, Icon }) => (
            <a
              key={value}
              href={`#${value}`}
              aria-current={(current ?? IDS[0]) === value ? "true" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2.5 rounded-pill px-3.5 font-semibold text-[14.5px] transition-colors duration-150 ease-soft lg:rounded-lg",
                (current ?? IDS[0]) === value
                  ? "bg-surface text-ink shadow-card"
                  : "text-ink-muted hover:bg-sunken hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
              {t(`tabs.${value}`)}
            </a>
          ))}
        </nav>
        <div className="flex min-w-0 flex-col gap-4">
          {SETTINGS_PARTS.map(({ value, Icon }) => {
            const Pane = PANES[value];
            return (
              <section
                key={value}
                id={value}
                aria-labelledby={`${value}-h`}
                className="flex scroll-mt-24 flex-col gap-5 rounded-xl bg-surface p-5 sm:p-6"
              >
                <h2
                  id={`${value}-h`}
                  className="flex items-center gap-2.5 font-bold font-display text-[20px] tracking-[-0.01em]"
                >
                  <Icon className="size-5 text-ink-muted" strokeWidth={1.75} />
                  {t(`tabs.${value}`)}
                </h2>
                <Pane />
              </section>
            );
          })}
        </div>
      </div>
    </Screen>
  );
}

/**
 * The section read now: the last one whose top passed the top bar, or the
 * last of all once the page is scrolled to its end; at first, the one the
 * address names (#game), which the page may not scroll far enough to reach.
 * Null until measured.
 */
function useInView(ids: readonly string[]) {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let found = ids[0];
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= 120) found = id;
      }
      setCurrent(atEnd ? ids[ids.length - 1] : found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const asked = window.location.hash.slice(1);
    if (ids.includes(asked)) setCurrent(asked);
    else measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);
  return current;
}
