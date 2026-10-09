"use client";

import { ChevronLeft, Plus } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import type { ComponentType, ReactNode } from "react";
import { keyClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { MatchGate } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { GameActions } from "@/features/game-page/game-actions";
import { GameRanking } from "@/features/game-page/game-ranking";
import { GameScenes } from "@/features/game-page/game-scenes";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { PublicRooms } from "@/features/home/public-rooms";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { GAMES, newRoom } from "@/lib/routes";
import { JoinByCode } from "./join-by-code";

/**
 * A game's own page: its banner, name and pitch, create or join by code,
 * where to go next, its ranking, a match played out, and its public rooms.
 */
export function GameHub({
  game,
  banner: Banner,
  extra,
}: {
  game: GameKey;
  /** The game's banner; wide screens set creating and joining in it, as `aside`. */
  banner: ComponentType<{ aside: ReactNode }>;
  /** The game's own, under the pitch. */
  extra?: ReactNode;
}) {
  const t = useTranslations("home");
  const gameName = useGameName();
  useAuthErrorToast();
  const { match } = useCurrentMatch();

  return (
    <Screen
      left={<HubBrand />}
      right={<HubActions />}
      banner={<Banner aside={<Start game={game} off={!!match} />} />}
    >
      {/*
        the main column: the pitch and where to go next, then the ranking
        and the match played out; the public rooms beside it
      */}
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)]">
            <m.section
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: ease.soft },
              }}
              className="flex flex-col gap-4"
            >
              <Link
                href={GAMES}
                className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
                {t("games.back")}
              </Link>
              <h1 className="text-balance font-display font-extrabold text-[clamp(40px,5vw,60px)] leading-none tracking-[-0.025em]">
                {gameName(game)}
              </h1>
              <p className="text-[17px] text-ink-muted leading-[26px]">
                {t(`games.${GAME_INFO[game].messages}.pitch`)}
              </p>
              {/* under the pitch until the banner has room for it */}
              <Start game={game} off={!!match} className="mt-2 xl:hidden" />
              {extra}
            </m.section>
            <GameActions game={game} className="lg:mt-9" />
          </div>
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <GameRanking game={game} />
            <GameScenes game={game} />
          </div>
        </div>

        {/* the public rooms; locked during a match */}
        <MatchGate>
          <PublicRooms game={game} />
        </MatchGate>
      </div>
    </Screen>
  );
}

/** Create a room, or join one with a code; off during a match. */
function Start({
  game,
  off,
  className,
}: {
  game: GameKey;
  off: boolean;
  className?: string;
}) {
  const t = useTranslations("home");
  return (
    <div
      inert={off ? true : undefined}
      className={cn(
        "flex flex-wrap items-end gap-x-6 gap-y-5 transition-opacity duration-500 ease-soft",
        off && "pointer-events-none select-none opacity-35 grayscale",
        className,
      )}
    >
      {/* as tall as the code field's label and input beside it, lip included */}
      <Link
        href={newRoom(game)}
        className={keyClass("sky", {
          bounce: true,
          className:
            "min-h-16 grow self-stretch px-8 text-xl max-sm:w-full sm:max-w-80",
        })}
      >
        <Plus className="size-6 shrink-0" strokeWidth={2.75} />
        {t("create")}
      </Link>
      <JoinByCode />
    </div>
  );
}
