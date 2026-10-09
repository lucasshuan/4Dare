"use client";

import { ArrowRight, Plus } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { PageHead } from "@/components/ui/page-head";
import { Screen } from "@/components/ui/screen";
import { GAME_INFO, GameThumb, useGameName } from "@/features/create/game-info";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { GAME_PATHS, newRoom } from "@/lib/routes";

/** Each game's art ground, behind its step numbers. */
const ART: Record<GameKey, string> = {
  "who-am-i": "art-whoami",
  impostor: "art-impostor",
  lineup: "art-lineup",
};

interface Step {
  t: string;
  x: string;
}

/** Rises in as it scrolls into view, once. */
const inView = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.46, ease: ease.soft, delay: i * 0.05 },
});

/**
 * /how-to-play: every game's rules on one page. A chip per game jumps to
 * its part; each part has the game's scene (the home tile's art, playing),
 * its steps numbered, a tip, and the way into a room. What every game
 * shares closes the page.
 */
export function HowToScreen() {
  const t = useTranslations("howTo");
  const name = useGameName();
  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <PageHead eyebrow={t("eyebrow")} title={t("title")} lead={t("lead")} />
      <nav
        aria-label={t("jump")}
        className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none]"
      >
        {OPEN_GAMES.map((game) => (
          <a
            key={game}
            href={`#${game}`}
            className="inline-flex h-12 shrink-0 items-center gap-2.5 rounded-[18px] border border-line bg-surface py-0 pr-4 pl-1.5 font-semibold text-[15px] transition-[translate,box-shadow] duration-150 ease-soft hover:-translate-y-px hover:shadow-card active:scale-[0.97]"
          >
            <GameThumb game={game} size="sm" />
            {name(game)}
          </a>
        ))}
      </nav>
      <div className="flex flex-col gap-14 sm:gap-20">
        {OPEN_GAMES.map((game) => (
          <GamePart key={game} game={game} />
        ))}
        <Common />
      </div>
    </Screen>
  );
}

function GamePart({ game }: { game: GameKey }) {
  const t = useTranslations("howTo");
  const tGame = useTranslations(`home.games.${GAME_INFO[game].messages}`);
  const key = GAME_INFO[game].messages;
  const steps = t.raw(`games.${key}.steps`) as Step[];
  const { Art } = GAME_INFO[game];
  return (
    <section
      id={game}
      aria-labelledby={`${game}-h`}
      className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10"
    >
      <m.div
        {...inView(0)}
        className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start"
      >
        <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-sunken shadow-card [container-type:inline-size]">
          <Art wide className="absolute inset-0" />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="font-semibold text-[13px] text-ink-muted">
            {tGame("players")}
          </span>
          <h2
            id={`${game}-h`}
            className="font-display font-extrabold text-[32px] leading-none tracking-[-0.02em]"
          >
            {tGame("name")}
          </h2>
          <p className="max-w-[52ch] text-ink-muted">{tGame("pitch")}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href={newRoom(game)} className={buttonClass("primary", "md")}>
            <Plus className="size-5" strokeWidth={2} />
            {t("create")}
          </Link>
          <Link
            href={GAME_PATHS[game]}
            className={buttonClass("secondary", "md")}
          >
            {t("page")}
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </m.div>
      <div className="flex flex-col gap-3">
        <ol className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <m.li
              key={step.t}
              {...inView(i + 1)}
              className="flex gap-4 rounded-lg border border-line bg-surface p-4 sm:p-5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-pill font-display font-extrabold text-[17px] text-ink",
                  ART[game],
                )}
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="sr-only">{t("step", { n: i + 1 })}</span>
                <h3 className="font-bold font-display text-[18px] leading-tight tracking-[-0.01em]">
                  {step.t}
                </h3>
                <p className="text-[15px] text-ink-muted">{step.x}</p>
              </div>
            </m.li>
          ))}
        </ol>
        <m.p
          {...inView(steps.length + 1)}
          className="rounded-lg bg-butter px-4 py-3 font-semibold text-[14px] text-on-butter"
        >
          {t(`games.${key}.tip`)}
        </m.p>
      </div>
    </section>
  );
}

function Common() {
  const t = useTranslations("howTo");
  const items = t.raw("common.items") as { e: string; x: string }[];
  return (
    <section aria-labelledby="common-h" className="flex flex-col gap-4">
      <h2
        id="common-h"
        className="font-display font-extrabold text-[26px] leading-tight tracking-[-0.015em]"
      >
        {t("common.title")}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <m.li
            key={item.x}
            {...inView(i)}
            className="flex flex-col gap-3 rounded-lg bg-surface p-5 shadow-card"
          >
            <span aria-hidden="true" className="text-[28px] leading-none">
              {item.e}
            </span>
            <p className="font-medium text-[15px]">{item.x}</p>
          </m.li>
        ))}
      </ul>
    </section>
  );
}
