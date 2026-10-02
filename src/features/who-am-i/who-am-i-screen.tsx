"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PublicRooms } from "@/features/home/public-rooms";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { UserMenu } from "@/features/home/user-menu";
import { Link } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import { GAMES } from "@/lib/routes";
import { JoinByCode } from "./join-by-code";

/** "Who am I?": create a room, join one with a code, or pick a public one. */
export function WhoAmIScreen() {
  const t = useTranslations("home");
  useAuthErrorToast();

  return (
    <Screen
      left={<UserMenu />}
      right={
        <>
          <LanguageSwitch />
          <ThemeToggle />
        </>
      }
    >
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,472px)] lg:justify-between">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: ease.soft },
          }}
          className="flex flex-col gap-8"
        >
          <div className="flex flex-col gap-4">
            <Link
              href={GAMES}
              className="-ml-1.5 inline-flex items-center gap-1 self-start font-semibold text-ink-muted text-sm transition-colors hover:text-ink"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
              {t("games.back")}
            </Link>
            <h1 className="text-balance font-display font-extrabold text-[clamp(56px,8vw,96px)] leading-[0.95] tracking-[-0.03em]">
              {t("games.whoAmI.name")}
            </h1>
            <p className="text-ink-muted text-lg">{t("pitch")}</p>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
            <Link
              href="/new"
              className={buttonClass("primary", "lg", "max-sm:w-full")}
            >
              {t("create")}
            </Link>
            <JoinByCode />
          </div>
        </motion.section>

        <PublicRooms />
      </div>
    </Screen>
  );
}
