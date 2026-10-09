"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { profilePath } from "@/features/profile/profile-link";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { RANKINGS } from "@/lib/routes";
import type { RankingPage } from "@/server/community-contract";

/** The podium's places, left to right: second, first, third. */
const PODIUM = [
  { i: 1, step: "h-11" },
  { i: 0, step: "h-[60px] border-transparent bg-butter text-on-butter" },
  { i: 2, step: "h-8" },
];

/**
 * The game's weekly ranking, as the rankings page has it: its top three on
 * a podium. Empty places wait as skeletons.
 */
export function GameRanking({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.ranking");
  const lang = useLocale();
  const format = useFormatter();
  const { data, isPending } = useQuery({
    queryKey: ["rankings", lang, game, "week"],
    queryFn: async (): Promise<RankingPage> => {
      const p = new URLSearchParams({ lang, period: "week", game });
      const res = await fetch(`/api/rankings?${p}`);
      if (!res.ok) throw new Error(`rankings: ${res.status}`);
      return (await res.json()) as RankingPage;
    },
  });
  const rows = data?.rows ?? [];
  const bar = "rounded-pill bg-sunken";
  return (
    <section
      aria-labelledby="game-ranking-h"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="game-ranking-h"
          className="font-bold font-display text-[19px] tracking-[-0.01em]"
        >
          {t("title")}
        </h2>
        <Link
          href={`${RANKINGS}?game=${game}`}
          className="inline-flex items-center gap-1 font-semibold text-[13px] text-sky hover:underline"
        >
          {t("all")}
          <ArrowRight className="size-3.5" strokeWidth={2} />
        </Link>
      </div>
      <ol aria-busy={isPending} className="grid grid-cols-3 items-end gap-2">
        {PODIUM.map(({ i, step }) => {
          const r = rows[i];
          return (
            <li
              key={i}
              style={{ order: i === 0 ? 2 : i === 1 ? 1 : 3 }}
              className="flex min-w-0 flex-col items-center gap-1 text-center"
            >
              {r ? (
                <Link
                  href={profilePath(r.person.handle)}
                  scroll={false}
                  className="flex min-w-0 max-w-full flex-col items-center gap-1"
                >
                  {i === 0 ? (
                    <Crown className="h-4 text-gold" strokeWidth={2} />
                  ) : null}
                  <Avatar avatar={r.person.avatar} size={i === 0 ? 44 : 36} />
                  <b className="max-w-full truncate font-bold text-[13px] leading-tight">
                    {r.person.name}
                  </b>
                  <small className="font-medium font-mono text-[11.5px] text-ink-muted">
                    {t("xp", { n: format.number(r.xp) })}
                  </small>
                </Link>
              ) : (
                <>
                  <span
                    className={cn(
                      bar,
                      i === 0 ? "size-11" : "size-9",
                      isPending && "animate-pulse",
                    )}
                  />
                  <span
                    className={cn(
                      bar,
                      "h-2.5 w-14",
                      isPending && "animate-pulse",
                    )}
                  />
                  <span
                    className={cn(bar, "h-2 w-9", isPending && "animate-pulse")}
                  />
                </>
              )}
              <span
                className={cn(
                  "mt-1 flex w-full items-start justify-center rounded-[12px_12px_5px_5px] border border-line pt-1 font-display font-extrabold text-[17px] text-ink-muted leading-none",
                  step,
                )}
              >
                {i + 1}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
