"use client";

import {
  Coins,
  Flame,
  Palette,
  ShieldCheck,
  Tag,
  Target,
  VenetianMask,
  Zap,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { GameThumb, useGameName } from "@/features/create/game-info";
import type { GameKey } from "@/game/games";
import type { Lang } from "@/game/types";
import { cn } from "@/lib/cn";
import type { FactView } from "@/server/contract";
import type { streaks } from "./garden-days";
import { ProfileLink } from "./profile-link";

type Fact = {
  key: string;
  icon: ReactNode;
  /** The tile's ground and its icon's colour. */
  tint: string;
  title: ReactNode;
  text: ReactNode;
  game: GameKey | null;
};

/**
 * The curiosities, each in its own small tinted tile under the profile's head:
 * the facts the server found, and the longest streak.
 */
export function FunFacts({
  facts,
  owner,
  streak,
  className,
}: {
  facts: FactView[];
  owner: string;
  streak: ReturnType<typeof streaks>;
  className?: string;
}) {
  const t = useTranslations("profile.facts");
  const lang = useLocale() as Lang;
  const format = useFormatter();
  const gameName = useGameName();
  const items: Fact[] = [];
  const minutes = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  for (const f of facts) {
    if (f.kind === "partner")
      items.push({
        key: "partner",
        icon: <Avatar avatar={f.person.avatar} size={30} />,
        tint: "bg-surface",
        game: null,
        title: t.rich("partner", {
          name: f.person.name,
          link: (chunks) => (
            <ProfileLink
              handle={f.person.handle}
              className="underline-offset-2 hover:underline"
            >
              {chunks}
            </ProfileLink>
          ),
        }),
        text: t("partnerText", { together: f.together, ahead: f.ahead, owner }),
      });
    else if (f.kind === "fastest")
      items.push({
        key: "fastest",
        icon: <Zap />,
        tint: "bg-butter-soft text-on-butter",
        game: f.game,
        title: t("fastest"),
        text:
          f.timeMs === null
            ? t("fastestText", { name: f.characterName, at: f.at })
            : t("fastestTime", {
                name: f.characterName,
                at: f.at,
                time: minutes(f.timeMs),
              }),
      });
    else if (f.kind === "hardest")
      items.push({
        key: "hardest",
        icon: <ShieldCheck />,
        tint: "bg-(--accent-soft) text-(--accent)",
        game: f.game,
        title: t("hardest"),
        text: t("hardestText", {
          name: f.characterName,
          to: f.to?.name ?? t("aGuest"),
          questions: f.questions,
        }),
      });
    else if (f.kind === "theme")
      items.push({
        key: "theme",
        icon: <Palette />,
        tint: "bg-yes-soft text-yes",
        game: f.game,
        title: t("theme"),
        text: t("themeText", {
          theme: f.theme[lang] || f.theme.en,
          n: f.count,
        }),
      });
    else if (f.kind === "escape")
      items.push({
        key: "escape",
        icon: <VenetianMask />,
        tint: "bg-no-soft text-no",
        game: f.game,
        title: t("escape"),
        text: t("escapeText", { name: f.characterName, votes: f.votes }),
      });
    else if (f.kind === "bargain")
      items.push({
        key: "bargain",
        icon: <Tag />,
        tint: "bg-yes-soft text-yes",
        game: f.game,
        title: t("bargain"),
        text: t("bargainText", { coins: f.spent, votes: f.votes }),
      });
    else if (f.kind === "splurge")
      items.push({
        key: "splurge",
        icon: <Coins />,
        tint: "bg-butter-soft text-on-butter",
        game: f.game,
        title: t("splurge"),
        text: t("splurgeText", { coins: f.price }),
      });
    else
      items.push({
        key: "bullseye",
        icon: <Target />,
        tint: "bg-sky-soft text-sky",
        game: f.game,
        title: t("bullseye"),
        text: t("bullseyeText", { name: f.guess }),
      });
  }
  if (streak.best >= 2 && streak.bestEnd !== null)
    items.splice(facts[0]?.kind === "partner" ? 1 : 0, 0, {
      key: "streak",
      icon: <Flame />,
      tint: "bg-apricot-soft text-apricot",
      game: null,
      title: t("streak"),
      text: t("streakText", {
        n: streak.best,
        month: format.dateTime(streak.bestEnd, {
          month: "long",
          year: "numeric",
        }),
      }),
    });
  if (items.length === 0) return null;
  return (
    <section aria-label={t("title")} className={className}>
      {/* a swipeable row on phones, a grid of tiles wider */}
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-(--pad) pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:overflow-visible sm:pb-0">
        {items.map((it) => (
          <li
            key={it.key}
            className={cn(
              "relative flex w-[232px] shrink-0 snap-start flex-col gap-2 overflow-hidden rounded-xl p-3.5 sm:w-auto",
              it.tint,
            )}
          >
            {/* the icon again, big and faint in the corner */}
            {it.key === "partner" ? null : (
              <span
                aria-hidden
                className="-right-3 -bottom-4 pointer-events-none absolute rotate-12 opacity-[0.12] [&_svg]:size-[84px] [&_svg]:stroke-[1.5]"
              >
                {it.icon}
              </span>
            )}
            <span className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-pill [&_svg]:size-[18px] [&_svg]:stroke-2",
                  it.key === "partner" ? "" : "bg-surface/70",
                )}
              >
                {it.icon}
              </span>
              {it.game ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface/70 py-0.5 pr-2 pl-0.5 font-semibold text-[11.5px] text-ink-muted">
                  <GameThumb game={it.game} size="tiny" />
                  {gameName(it.game)}
                </span>
              ) : null}
            </span>
            <b className="relative font-bold font-display text-[15px] text-ink leading-tight">
              {it.title}
            </b>
            <span className="relative text-[13px] text-ink-muted leading-snug">
              {it.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
