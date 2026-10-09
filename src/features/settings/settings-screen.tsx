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
 */
export function SettingsScreen() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const current = useInView(IDS);
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
              aria-current={current === value ? "true" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2.5 rounded-pill px-3.5 font-semibold text-[14.5px] transition-colors duration-150 ease-soft lg:rounded-lg",
                current === value
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

/** The section nearest the top of the window, among those showing. */
function useInView(ids: readonly string[]) {
  const [current, setCurrent] = useState(ids[0]);
  useEffect(() => {
    const showing = new Set<string>();
    const watch = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) showing.add(e.target.id);
          else showing.delete(e.target.id);
        const first = ids.find((id) => showing.has(id));
        if (first) setCurrent(first);
      },
      // a band across the upper part of the window
      { rootMargin: "-96px 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) watch.observe(el);
    }
    return () => watch.disconnect();
  }, [ids]);
  return current;
}
