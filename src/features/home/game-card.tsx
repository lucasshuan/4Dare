"use client";

import { ArrowRight, UsersRound } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { GAME_INFO } from "@/features/create/game-info";
import { LiveDot } from "@/features/current-match/match-lock";
import { usePlayersOnline } from "@/features/data/use-public-rooms";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { GAME_PATHS } from "@/lib/routes";

/**
 * Each caption fades up from a deep, saturated shade of its game's hue (oklch
 * chroma and hue; the lightness comes from the page's theme), not from black or a
 * darkened pastel, which turns grey.
 */
const TILE_GROUND: Record<GameKey, string> = {
  "who-am-i": "0.14 272",
  impostor: "0.13 305",
  lineup: "0.09 62",
};

/** A game's square tile (the hub and the games page): its art, and on hover its name, players and Play. */
export function GameCard({
  game,
  delay,
  className,
}: {
  game: GameKey;
  delay: number;
  /** The tile's width. */
  className?: string;
}) {
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
      className={className}
    >
      {/* The artwork keeps its palette, but rests dimmed on a dark page and
          veiled in the canvas colour on a light page. Hovering or focusing
          lights it and raises its name. Phones have no hover: their tiles stay lit, with a
          small caption on */}
      <Link
        href={GAME_PATHS[game]}
        className={cn(
          "group/tile relative block aspect-square overflow-hidden bg-surface-sunken outline-offset-[-3px]! transition-[filter] duration-500 ease-soft [container-type:inline-size] sm:saturate-45 sm:dark:brightness-42 sm:dark:saturate-35 sm:focus-visible:saturate-100 sm:hover:saturate-100 sm:dark:focus-visible:brightness-100 sm:dark:focus-visible:saturate-100 sm:dark:hover:brightness-100 sm:dark:hover:saturate-100",
        )}
      >
        <Art />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[5] bg-canvas/60 transition-opacity duration-500 ease-soft max-sm:hidden dark:hidden group-hover/tile:opacity-0 group-focus-visible/tile:opacity-0"
        />
        <div
          style={
            {
              "--shade": `oklch(var(--l) ${TILE_GROUND[game]})`,
            } as CSSProperties
          }
          className="absolute inset-x-0 bottom-0 z-[6] flex flex-col gap-0.5 bg-[linear-gradient(to_top,color-mix(in_oklch,var(--shade)_70%,transparent),transparent)] px-3 pt-[30px] pb-[11px] text-white [--l:0.42] dark:[--l:0.3] sm:top-0 sm:justify-end sm:gap-2 sm:bg-[linear-gradient(to_top,color-mix(in_oklch,var(--shade)_76%,transparent),color-mix(in_oklch,var(--shade)_46%,transparent)_34%,transparent_62%)] sm:p-6 sm:opacity-0 sm:transition-opacity sm:duration-350 sm:ease-soft sm:group-hover/tile:opacity-100 sm:group-focus-visible/tile:opacity-100 [&>*]:transition-transform [&>*]:duration-450 [&>*]:ease-soft sm:[&>*]:translate-y-3 sm:group-hover/tile:[&>*]:translate-y-0 sm:group-focus-visible/tile:[&>*]:translate-y-0"
        >
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
