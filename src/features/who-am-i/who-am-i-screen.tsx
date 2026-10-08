"use client";

import { ChevronLeft, Plus } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { keyClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { GAME_INFO, useGameName } from "@/features/create/game-info";
import { MatchGate } from "@/features/current-match/match-lock";
import { useCurrentMatch } from "@/features/data/use-current-match";
import { HubActions, HubBrand } from "@/features/home/hub-actions";
import { PublicRooms } from "@/features/home/public-rooms";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { GAMES, newRoom } from "@/lib/routes";
import { JoinByCode } from "./join-by-code";
import { WhoAmIBanner } from "./who-am-i-banner";

/** "Who am I?": create a room, join one with a code, or pick a public one. */
export function WhoAmIScreen() {
  return <GameHub game="who-am-i" banner={<WhoAmIBanner />} />;
}

/** A game's own page: its banner, name and pitch, create or join by code, and its public rooms. */
export function GameHub({
  game,
  banner,
}: {
  game: GameKey;
  banner: ReactNode;
}) {
  const t = useTranslations("home");
  const gameName = useGameName();
  useAuthErrorToast();
  const { match } = useCurrentMatch();

  return (
    <Screen left={<HubBrand />} right={<HubActions />} banner={banner}>
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,560px)] lg:justify-between">
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
            {game === "who-am-i"
              ? t("pitch")
              : t(`games.${GAME_INFO[game].messages}.pitch`)}
          </p>
          {/* creating or joining by code sits under the pitch, so the rooms get the height; off during a match */}
          <div
            inert={match ? true : undefined}
            className={cn(
              "mt-2 flex flex-wrap items-end gap-x-6 gap-y-5 transition-opacity duration-500 ease-soft",
              match && "pointer-events-none select-none opacity-35 grayscale",
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
        </m.section>

        {/* the public rooms; locked during a match */}
        <MatchGate>
          <PublicRooms game={game} />
        </MatchGate>
      </div>
    </Screen>
  );
}
