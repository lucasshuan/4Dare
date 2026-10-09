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

/** A tile: what the fact is (small), the fact itself (big), a word more. */
type Fact = {
  key: string;
  icon: ReactNode;
  /** The tile's ground and its icon's colour. */
  tint: string;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  game: GameKey | null;
};

/**
 * The curiosities, each in its own small tinted tile under the profile's head:
 * the facts the server found, and the longest streak.
 */
export function FunFacts({
  facts,
  streak,
  className,
}: {
  facts: FactView[];
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
        label: t("partnerLabel"),
        value: (
          <ProfileLink
            handle={f.person.handle}
            className="underline-offset-2 hover:underline"
          >
            {f.person.name}
          </ProfileLink>
        ),
        sub: t("partnerSub", { together: f.together }),
      });
    else if (f.kind === "fastest")
      items.push({
        key: "fastest",
        icon: <Zap />,
        tint: "bg-butter-soft text-on-butter",
        game: f.game,
        label: t("fastest"),
        value:
          f.timeMs === null ? t("fastestAt", { at: f.at }) : minutes(f.timeMs),
        sub: f.characterName,
      });
    else if (f.kind === "hardest")
      items.push({
        key: "hardest",
        icon: <ShieldCheck />,
        tint: "bg-(--accent-soft) text-(--accent)",
        game: f.game,
        label: t("hardest"),
        value: f.characterName,
        sub: t("hardestSub", { questions: f.questions }),
      });
    else if (f.kind === "theme")
      items.push({
        key: "theme",
        icon: <Palette />,
        tint: "bg-yes-soft text-yes",
        game: f.game,
        label: t("theme"),
        value: f.theme[lang] || f.theme.en,
        sub: t("themeSub", { n: f.count }),
      });
    else if (f.kind === "escape")
      items.push({
        key: "escape",
        icon: <VenetianMask />,
        tint: "bg-no-soft text-no",
        game: f.game,
        label: t("escape"),
        value: f.characterName,
        sub: t("escapeSub", { votes: f.votes }),
      });
    else if (f.kind === "bargain")
      items.push({
        key: "bargain",
        icon: <Tag />,
        tint: "bg-yes-soft text-yes",
        game: f.game,
        label: t("bargain"),
        value: t("bargainValue", { coins: f.spent }),
        sub: t("bargainSub"),
      });
    else if (f.kind === "splurge")
      items.push({
        key: "splurge",
        icon: <Coins />,
        tint: "bg-butter-soft text-on-butter",
        game: f.game,
        label: t("splurge"),
        value: t("splurgeValue", { coins: f.price }),
        sub: t("splurgeSub"),
      });
    else
      items.push({
        key: "bullseye",
        icon: <Target />,
        tint: "bg-sky-soft text-sky",
        game: f.game,
        label: t("bullseye"),
        value: f.guess,
        sub: t("bullseyeSub"),
      });
  }
  if (streak.best >= 2 && streak.bestEnd !== null)
    items.splice(facts[0]?.kind === "partner" ? 1 : 0, 0, {
      key: "streak",
      icon: <Flame />,
      tint: "bg-apricot-soft text-apricot",
      game: null,
      label: t("streak"),
      value: t("streakValue", { n: streak.best }),
      sub: format.dateTime(streak.bestEnd, { month: "long", year: "numeric" }),
    });
  if (items.length === 0) return null;
  return (
    <section aria-label={t("title")} className={className}>
      {/* a swipeable row on phones, a grid of tiles wider */}
      <ul className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-(--pad) pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:overflow-visible sm:pb-0">
        {items.map((it) => (
          <li
            key={it.key}
            className={cn(
              "relative flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-xl p-3.5 sm:w-auto",
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
            <span className="relative flex items-center gap-2">
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-pill [&_svg]:size-4 [&_svg]:stroke-2",
                  it.key === "partner" ? "" : "bg-surface/70",
                )}
              >
                {it.icon}
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 font-semibold text-[12.5px] text-ink-muted leading-tight">
                {it.label}
              </span>
              {it.game ? (
                <span title={gameName(it.game)} className="flex shrink-0">
                  <GameThumb game={it.game} size="tiny" />
                </span>
              ) : null}
            </span>
            <b className="relative mt-3 line-clamp-2 font-display font-extrabold text-[22px] text-ink leading-[1.1] tracking-[-0.01em]">
              {it.value}
            </b>
            <span className="relative mt-1 truncate text-[12.5px] text-ink-muted">
              {it.sub}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
