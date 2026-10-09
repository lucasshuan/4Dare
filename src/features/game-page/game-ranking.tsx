"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Crown } from "lucide-react";
import { m } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { profilePath } from "@/features/profile/profile-link";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { RANKINGS } from "@/lib/routes";
import type { RankingPage } from "@/server/community-contract";

/**
 * The podium's places, left to right: second, first, third. `rise` is when
 * each step grows on arrival: third, then second, first last.
 */
const PODIUM = [
  { i: 1, step: "h-11", rise: 0.32 },
  {
    i: 0,
    step: "h-[60px] border-transparent bg-butter text-on-butter",
    rise: 0.46,
  },
  { i: 2, step: "h-8", rise: 0.2 },
];

/** The game's weekly ranking (shared with the game's panel, which shows its helpers). */
export function useWeekRanking(game: GameKey) {
  const lang = useLocale();
  return useQuery({
    queryKey: ["rankings", lang, game, "week"],
    queryFn: async (): Promise<RankingPage> => {
      const p = new URLSearchParams({ lang, period: "week", game });
      const res = await fetch(`/api/rankings?${p}`);
      if (!res.ok) throw new Error(`rankings: ${res.status}`);
      return (await res.json()) as RankingPage;
    },
  });
}

/**
 * The game's weekly ranking, as the rankings page has it: its top three on
 * a podium. Empty places wait as skeletons. On arrival the steps grow one
 * by one, then the faces pop onto them and the crown drops on the first.
 */
export function GameRanking({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.ranking");
  const format = useFormatter();
  const { data, isPending } = useWeekRanking(game);
  const rows = data?.rows ?? [];
  // sunken is darker than the canvas on dark: ink tints show on both
  const bar = "rounded-pill bg-ink/10";
  return (
    <section
      aria-labelledby="game-ranking-h"
      className={cn("flex flex-col gap-3", className)}
    >
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: ease.soft }}
        className="flex items-center justify-between gap-2"
      >
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
      </m.div>
      <ol aria-busy={isPending} className="grid grid-cols-3 items-end gap-2">
        {PODIUM.map(({ i, step, rise }) => {
          const r = rows[i];
          return (
            <li
              key={i}
              style={{ order: i === 0 ? 2 : i === 1 ? 1 : 3 }}
              className="flex min-w-0 flex-col items-center gap-1 text-center"
            >
              {r ? (
                <m.span
                  initial={{ opacity: 0, scale: 0.4, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 16,
                    delay: rise + 0.22,
                  }}
                  className="flex min-w-0 max-w-full"
                >
                  <Link
                    href={profilePath(r.person.handle)}
                    scroll={false}
                    className="flex min-w-0 max-w-full flex-col items-center gap-1"
                  >
                    {i === 0 ? (
                      <m.span
                        initial={{ opacity: 0, y: -16, rotate: -40 }}
                        animate={{ opacity: 1, y: 0, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 11,
                          delay: rise + 0.5,
                        }}
                      >
                        <Crown className="h-4 text-gold" strokeWidth={2} />
                      </m.span>
                    ) : null}
                    <Avatar avatar={r.person.avatar} size={i === 0 ? 44 : 36} />
                    <b className="max-w-full truncate font-bold text-[13px] leading-tight">
                      {r.person.name}
                    </b>
                    <small className="font-medium font-mono text-[11.5px] text-ink-muted">
                      {t("xp", { n: format.number(r.xp) })}
                    </small>
                  </Link>
                </m.span>
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
              <m.span
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                  delay: rise,
                }}
                className={cn(
                  "mt-1 flex w-full origin-bottom items-start justify-center rounded-[12px_12px_5px_5px] border border-line pt-1 font-display font-extrabold text-[17px] text-ink-muted leading-none",
                  step,
                )}
              >
                {i + 1}
              </m.span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
