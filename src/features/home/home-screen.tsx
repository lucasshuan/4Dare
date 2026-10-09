"use client";

import { ArrowRight, Sparkles, UsersRound } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Screen } from "@/components/ui/screen";
import { GAME_INFO } from "@/features/create/game-info";
import { LiveDot } from "@/features/current-match/match-lock";
import { usePlayersOnline } from "@/features/data/use-public-rooms";
import { type GameKey, OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { GAME_PATHS } from "@/lib/routes";
import { GamesCarousel } from "./games-carousel";
import { HubActions, HubBrand } from "./hub-actions";
import { useAuthErrorToast } from "./use-auth-error";

/**
 * Square tiles, side by side with no gap. On wider screens their width
 * follows the window height, so the whole hub fits on screen without a
 * vertical scroll (344px from about a 730px-tall window up, less below);
 * phones get two a row.
 */
const CARD = "w-full sm:w-[clamp(220px,calc((100dvh_-_370px)_*_1.6),344px)]";

/** The hub: logo and who you are on top, then the games. */
export function HomeScreen() {
  const t = useTranslations("home");
  useAuthErrorToast();

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <section className="flex flex-col gap-3">
        <m.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: ease.soft },
          }}
          className="font-semibold text-xl"
        >
          {t("games.title")}
        </m.h1>
        <GamesCarousel>
          {OPEN_GAMES.map((game, i) => (
            <GameCard key={game} game={game} delay={0.12 + i * 0.08} />
          ))}
          <m.div
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { delay: 0.2 + OPEN_GAMES.length * 0.08 },
            }}
            className={`${CARD} flex aspect-square flex-col items-center justify-center gap-2 border-[1.5px] border-line-strong border-dashed p-4 text-center font-semibold text-ink-muted text-sm sm:hidden`}
          >
            <Sparkles className="size-5" strokeWidth={1.75} />
            {t("games.soon")}
          </m.div>
        </GamesCarousel>
      </section>
    </Screen>
  );
}

function GameCard({ game, delay }: { game: GameKey; delay: number }) {
  const { messages, Art } = GAME_INFO[game];
  const t = useTranslations(`home.games.${messages}`);
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay, duration: 0.55, ease: ease.soft },
      }}
      className={CARD}
    >
      {/* the tiles rest dimmed; hovering (or focusing) one lights it and
          raises its name. Phones have no hover: their tiles stay lit, with a
          small caption on */}
      <Link
        href={GAME_PATHS[game]}
        className="group/tile relative block aspect-square overflow-hidden bg-surface-sunken outline-offset-[-3px]! transition-[filter] duration-500 ease-soft [container-type:inline-size] sm:brightness-42 sm:saturate-35 sm:focus-visible:brightness-100 sm:focus-visible:saturate-100 sm:hover:brightness-100 sm:hover:saturate-100"
      >
        <Art />
        <div className="absolute inset-x-0 bottom-0 z-[6] flex flex-col gap-0.5 bg-[linear-gradient(to_top,rgb(12_14_22/0.82),rgb(12_14_22/0))] px-3 pt-[30px] pb-[11px] text-white sm:top-0 sm:justify-end sm:gap-3.5 sm:bg-[linear-gradient(to_top,rgb(12_14_22/0.9),rgb(12_14_22/0.62)_34%,rgb(12_14_22/0)_62%)] sm:p-6 sm:opacity-0 sm:transition-opacity sm:duration-350 sm:ease-soft sm:group-hover/tile:opacity-100 sm:group-focus-visible/tile:opacity-100 [&>*]:transition-transform [&>*]:duration-450 [&>*]:ease-soft sm:[&>*]:translate-y-3 sm:group-hover/tile:[&>*]:translate-y-0 sm:group-focus-visible/tile:[&>*]:translate-y-0">
          <h3 className="truncate font-display font-extrabold text-lg leading-[1.05] tracking-[-0.01em] sm:text-[min(38px,11cqw)] sm:leading-none">
            {t("name")}
          </h3>
          <div className="flex items-end justify-between gap-3 delay-40">
            <div className="flex min-w-0 flex-col gap-1 font-medium text-white/86 text-xs sm:text-sm">
              <span className="inline-flex items-center gap-1.5 max-sm:hidden">
                <UsersRound className="size-4" strokeWidth={1.75} />
                {t("players")}
              </span>
              <OnlineNow game={game} />
            </div>
            <span className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-pill bg-white px-[18px] font-semibold text-[#1e2433] text-[15px] max-sm:hidden">
              {t("play")}
              <ArrowRight
                className="size-4 transition-transform duration-300 ease-soft group-hover/tile:translate-x-0.5"
                strokeWidth={2}
              />
            </span>
          </div>
        </div>
      </Link>
    </m.div>
  );
}

/** "12 players online" beside a live dot; the line is kept (blank) until the count arrives. */
function OnlineNow({ game }: { game: GameKey }) {
  const t = useTranslations("home.games");
  const online = usePlayersOnline(game);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 transition-opacity duration-300",
        online ? "text-[#7ee0d8]" : "text-white/86",
        online === null && "invisible opacity-0",
      )}
    >
      <span className="flex size-4 items-center justify-center">
        {online ? (
          <LiveDot />
        ) : (
          <span className="size-2 rounded-full bg-current opacity-50" />
        )}
      </span>
      {t("online", { count: online ?? 0 })}
    </span>
  );
}
