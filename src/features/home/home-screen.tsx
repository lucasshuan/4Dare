"use client";

import { ArrowRight, Sparkles, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Screen } from "@/components/ui/screen";
import { LiveDot } from "@/features/current-match/match-lock";
import { usePlayersOnline } from "@/features/data/use-public-rooms";
import type { GameKey } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { ease } from "@/lib/motion";
import { WHO_AM_I } from "@/lib/routes";
import { GamesCarousel } from "./games-carousel";
import { HubActions, HubBrand } from "./hub-actions";
import { useAuthErrorToast } from "./use-auth-error";
import { WhoAmISnapshot } from "./who-am-i-snapshot";

/**
 * Card width follows the window height, so the whole hub fits on screen
 * without a vertical scroll (340px from about a 730px-tall window up, less below).
 */
const CARD = "w-[clamp(220px,calc((100dvh_-_370px)_*_1.6),340px)]";

/** The hub: logo and who you are on top, then the games. Only one so far. */
export function HomeScreen() {
  const t = useTranslations("home");
  useAuthErrorToast();

  return (
    <Screen left={<HubBrand />} right={<HubActions />}>
      <section className="flex flex-col gap-3">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: ease.soft },
          }}
          className="font-semibold text-xl"
        >
          {t("games.title")}
        </motion.h1>
        <GamesCarousel>
          <WhoAmICard />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.35 } }}
            className={`${CARD} flex h-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-strong border-dashed p-6 font-semibold text-ink-muted`}
          >
            <Sparkles className="size-5" strokeWidth={1.75} />
            {t("games.soon")}
          </motion.div>
        </GamesCarousel>
      </section>
    </Screen>
  );
}

function WhoAmICard() {
  const t = useTranslations("home.games.whoAmI");
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { delay: 0.12, duration: 0.55, ease: ease.soft },
      }}
      className={CARD}
    >
      <Link
        href={WHO_AM_I}
        className="group flex flex-col gap-3 rounded-xl bg-surface p-3 pb-4 shadow-card transition-[transform,box-shadow] duration-300 ease-soft hover:-translate-y-1 focus-visible:-translate-y-1"
      >
        <WhoAmISnapshot className="transition-transform duration-500 ease-soft group-hover:scale-[1.02]" />
        <div className="flex items-end justify-between gap-3 px-1.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="truncate font-bold font-display text-2xl tracking-[-0.01em]">
              {t("name")}
            </h3>
            <span className="inline-flex items-center gap-1.5 font-medium text-[13px] text-ink-muted">
              <UsersRound className="size-4" strokeWidth={1.75} />
              {t("players")}
            </span>
            <OnlineNow game="who-am-i" />
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-ink px-4 py-2 font-semibold text-on-ink text-sm">
            {t("play")}
            <ArrowRight
              className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/** "12 players online" beside a live dot; the line is kept (blank) until the count arrives. */
function OnlineNow({ game }: { game: GameKey }) {
  const t = useTranslations("home.games");
  const online = usePlayersOnline(game);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-[13px] transition-opacity duration-300",
        online ? "text-yes" : "text-ink-muted",
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
