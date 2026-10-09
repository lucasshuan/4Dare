"use client";

import { ArrowRight, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Segmented } from "@/features/create/settings-fields";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { RANKINGS } from "@/lib/routes";

const PERIODS = ["week", "month", "ever"] as const;
type Period = (typeof PERIODS)[number];

/**
 * The game's ranking, as on the rankings page with the game set: who scored
 * the most XP by week, month or ever. Not built yet, so its rows wait as
 * skeletons.
 */
export function GameRanking({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.ranking");
  const [period, setPeriod] = useState<Period>("week");
  return (
    <section
      aria-labelledby="game-ranking-h"
      className={cn("flex flex-col gap-3 rounded-xl bg-surface p-4", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="game-ranking-h"
          className="flex items-center gap-2 font-bold font-display text-[17px]"
        >
          <Trophy className="size-[18px] text-ink-muted" strokeWidth={1.75} />
          {t("title")}
        </h2>
        <Link
          href={`${RANKINGS}?game=${game}`}
          aria-label={t("all")}
          className="flex size-8 items-center justify-center rounded-pill text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ArrowRight className="size-4" strokeWidth={2} />
        </Link>
      </div>
      <Segmented
        label={t("period")}
        options={PERIODS}
        value={period}
        onChange={setPeriod}
        render={(p) => t(`periods.${p}`)}
        className="self-start"
      />
      <ol aria-busy="true" className="flex flex-col gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <span className="w-4 text-center font-medium font-mono text-[13px] text-ink-muted">
              {i + 1}
            </span>
            <span className="size-8 shrink-0 animate-pulse rounded-pill bg-sunken" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span
                className="h-2.5 animate-pulse rounded-pill bg-sunken"
                style={{ width: `${78 - ((i * 17) % 40)}%` }}
              />
              <span className="h-2 w-1/3 animate-pulse rounded-pill bg-sunken" />
            </span>
            <span className="h-2.5 w-9 animate-pulse rounded-pill bg-sunken" />
          </li>
        ))}
      </ol>
      <p className="text-[12.5px] text-ink-muted">{t("soon")}</p>
    </section>
  );
}
