"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Library,
  type LucideIcon,
  Mail,
  MessageCircleQuestion,
  Sparkles,
  Tags,
} from "lucide-react";
import { animate, m, useReducedMotion } from "motion/react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { useLineupCatalog } from "@/features/create/lineup-catalog";
import { useThemeCatalog } from "@/features/create/theme-catalog";
import { useQuestionBank } from "@/features/impostor/use-questions";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { CHARACTERS, CONTRIBUTIONS, WORKSHOP } from "@/lib/routes";
import type { LibraryPage, RankingPage } from "@/server/community-contract";
import { useWeekRanking } from "./game-ranking";

type Fact = "themes" | "questions" | "missions" | "characters";

/** What each game is made of, in order: its banks, then the cards. */
const FACTS: Record<GameKey, Fact[]> = {
  "who-am-i": ["themes", "characters"],
  impostor: ["themes", "questions", "characters"],
  lineup: ["missions", "characters"],
};

/** Each fact's look and where its tile goes: the Workshop grows the banks, the library has the cards. */
const LOOK: Record<
  Fact,
  { Icon: LucideIcon; tone: string; href: string; go: "suggest" | "browse" }
> = {
  themes: {
    Icon: Tags,
    tone: "bg-sky-soft text-sky",
    href: WORKSHOP,
    go: "suggest",
  },
  questions: {
    Icon: MessageCircleQuestion,
    tone: "bg-apricot-soft text-apricot",
    href: WORKSHOP,
    go: "suggest",
  },
  missions: {
    Icon: Mail,
    tone: "bg-butter-soft text-on-butter",
    href: WORKSHOP,
    go: "suggest",
  },
  characters: {
    Icon: Library,
    tone: "bg-yes-soft text-yes",
    href: CHARACTERS,
    go: "browse",
  },
};

/** When the tiles start coming in: with the podium, after the pitch. */
const START = 0.18;

/** How many characters the library has, as the characters page counts them. */
function useLibraryTotal(enabled: boolean) {
  const lang = useLocale();
  const { data } = useQuery({
    enabled,
    queryKey: ["library-total", lang],
    queryFn: async () => {
      const res = await fetch(`/api/characters/browse?lang=${lang}`);
      if (!res.ok) throw new Error(`library: ${res.status}`);
      return ((await res.json()) as LibraryPage).counts.all;
    },
    staleTime: 10 * 60_000,
  });
  return data;
}

/** Each fact's number for `game`; undefined while it loads. */
function useFacts(game: GameKey): Record<Fact, number | undefined> {
  const lineup = game === "lineup";
  const themes = useThemeCatalog(!lineup);
  const questions = useQuestionBank(game === "impostor");
  const catalog = useLineupCatalog(lineup);
  const library = useLibraryTotal(!lineup);
  return {
    themes: themes?.filter((t) => t.games.includes(game)).length,
    questions: questions?.size,
    missions: catalog?.missions.length,
    // the auction deals from its own deck; the other games from the whole library
    characters: lineup ? catalog?.deck.length : library,
  };
}

/**
 * A game's facts beside its ranking: what it is made of (themes, questions,
 * missions, characters), each counting up and opening where it grows, and
 * who helped most this month, opening the contributions. One slim row each,
 * so the list stands about as tall as the podium; the rows slide in one by
 * one with it.
 */
export function GameFacts({
  game,
  className,
}: {
  game: GameKey;
  className?: string;
}) {
  const t = useTranslations("home.gamePage.facts");
  const facts = useFacts(game);
  const helpers = useWeekRanking(game).data?.helpers;
  const tiles = [...FACTS[game], "contributors" as const];

  return (
    <section
      aria-labelledby="game-facts-h"
      className={cn("flex min-w-0 flex-col gap-3", className)}
    >
      <m.h2
        id="game-facts-h"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: ease.soft }}
        className="font-bold font-display text-[19px] tracking-[-0.01em]"
      >
        {t("title")}
      </m.h2>
      <ul className="flex flex-col gap-1.5">
        {tiles.map((key, i) => {
          const delay = START + i * 0.08;
          return (
            <m.li
              key={key}
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 20,
                delay,
              }}
              className="min-w-0"
            >
              {key === "contributors" ? (
                <Tile
                  href={CONTRIBUTIONS}
                  Icon={Sparkles}
                  tone="bg-sunken text-ink-muted"
                  label={t("contributors")}
                  go={helpers?.length ? t("month") : t("feed")}
                  head={<Faces helpers={helpers} delay={delay} />}
                />
              ) : (
                <Tile
                  href={LOOK[key].href}
                  Icon={LOOK[key].Icon}
                  tone={LOOK[key].tone}
                  label={t(key)}
                  go={t(LOOK[key].go)}
                  head={<Count n={facts[key]} delay={delay} />}
                />
              )}
            </m.li>
          );
        })}
      </ul>
    </section>
  );
}

/** One fact in a row: its icon, number (or faces) and name, and where it opens. */
function Tile({
  href,
  Icon,
  tone,
  label,
  go,
  head,
}: {
  href: string;
  Icon: LucideIcon;
  tone: string;
  label: string;
  go: string;
  head: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-3 overflow-hidden rounded-lg border-[1.5px] border-line py-1.5 pr-3 pl-1.5 transition-[background-color,border-color,translate] duration-200 ease-soft hover:translate-x-0.5 hover:border-line-strong hover:bg-surface"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-md transition-transform duration-300 ease-soft group-hover:-rotate-12 group-hover:scale-110",
          tone,
        )}
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        {head}
        <b className="truncate font-semibold text-[14px] text-ink-muted">
          {label}
        </b>
      </span>
      <small className="ml-auto flex shrink-0 items-center gap-1 font-medium text-[12px] text-ink-muted transition-colors group-hover:text-sky">
        <span className="max-sm:sr-only">{go}</span>
        <ArrowRight
          className="size-3.5 shrink-0 transition-transform duration-200 ease-soft group-hover:translate-x-0.5"
          strokeWidth={2.25}
        />
      </small>
    </Link>
  );
}

/** A pulsing bar where a number or faces will be. */
const Pending = ({ className }: { className: string }) => (
  <span
    className={cn(
      "block h-5 animate-pulse self-center rounded-pill bg-sunken",
      className,
    )}
  />
);

/** A number that counts up from zero once its tile is in; a pulsing bar before it arrives. */
function Count({ n, delay }: { n: number | undefined; delay: number }) {
  const format = useFormatter();
  const still = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (n === undefined) return;
    if (still) {
      setShown(n);
      return;
    }
    const run = animate(0, n, {
      duration: 1.1,
      delay,
      ease: ease.soft,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => run.stop();
  }, [n, still, delay]);
  if (n === undefined) return <Pending className="w-12" />;
  return (
    <b className="font-display font-extrabold text-[20px] tabular-nums leading-7 tracking-[-0.02em]">
      {format.number(shown)}
    </b>
  );
}

/** The month's top helpers, overlapping, popping in one by one; a pulsing bar before they arrive. */
function Faces({
  helpers,
  delay,
}: {
  helpers: RankingPage["helpers"] | undefined;
  delay: number;
}) {
  if (!helpers) return <Pending className="w-16" />;
  if (!helpers.length)
    return (
      <b className="font-display font-extrabold text-[20px] text-ink-muted leading-7">
        –
      </b>
    );
  return (
    <span className="flex h-7 items-center self-center">
      {helpers.map((h, i) => (
        <m.span
          key={h.person.id}
          initial={{ opacity: 0, scale: 0.3, x: -8 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 460,
            damping: 15,
            delay: delay + 0.25 + i * 0.09,
          }}
          className={cn(
            "rounded-pill shadow-[0_0_0_2px_var(--canvas)]",
            i > 0 && "-ml-2",
          )}
          style={{ zIndex: helpers.length - i }}
        >
          <Avatar avatar={h.person.avatar} size={24} />
        </m.span>
      ))}
    </span>
  );
}
