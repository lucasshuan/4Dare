"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { HubActions } from "@/features/home/hub-actions";
import { PublicRooms } from "@/features/home/public-rooms";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { Link } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import { GAMES, newRoom } from "@/lib/routes";
import { JoinByCode } from "./join-by-code";
import { WhoAmIBanner } from "./who-am-i-banner";

/** "Who am I?": create a room, join one with a code, or pick a public one. */
export function WhoAmIScreen() {
  const t = useTranslations("home");
  useAuthErrorToast();

  return (
    <Screen right={<HubActions />}>
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,472px)] lg:justify-between">
        <motion.section
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
          <WhoAmIBanner />
          <h1 className="text-balance font-display font-extrabold text-[clamp(40px,5vw,60px)] leading-none tracking-[-0.025em]">
            {t("games.whoAmI.name")}
          </h1>
          <p className="text-ink-muted text-lg">{t("pitch")}</p>
        </motion.section>

        {/* the public rooms, then creating one or joining by code */}
        <div className="flex flex-col gap-6 lg:pt-9">
          <PublicRooms game="who-am-i" />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
            <Link
              href={newRoom("who-am-i")}
              className={buttonClass("primary", "lg", "max-sm:w-full")}
            >
              {t("create")}
            </Link>
            <JoinByCode />
          </div>
        </div>
      </div>
    </Screen>
  );
}
