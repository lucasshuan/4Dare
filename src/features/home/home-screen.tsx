"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { Screen } from "@/components/ui/screen";
import { OPEN_GAMES } from "@/game/games";
import { Link } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import { GAME_LIST } from "@/lib/routes";
import { GameCard } from "./game-card";
import { GamesCarousel } from "./games-carousel";
import { HomeHero } from "./hero/home-hero";
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
    <Screen
      left={<HubBrand />}
      right={<HubActions />}
      stage="brand"
      banner={<HomeHero />}
    >
      <section className="flex flex-col gap-3">
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: ease.soft },
          }}
          className="flex items-baseline justify-between gap-4"
        >
          <h1 className="font-semibold text-xl">{t("games.title")}</h1>
          <Link
            href={GAME_LIST}
            className="group inline-flex items-center gap-1 font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
          >
            {t("games.seeAll")}
            <ArrowRight
              className="size-4 transition-transform duration-300 ease-soft group-hover:translate-x-0.5"
              strokeWidth={2}
            />
          </Link>
        </m.div>
        <GamesCarousel>
          {OPEN_GAMES.map((game, i) => (
            <GameCard
              key={game}
              game={game}
              delay={0.12 + i * 0.08}
              className={CARD}
            />
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
