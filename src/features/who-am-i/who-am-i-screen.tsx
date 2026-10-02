"use client";

import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { LanguageSwitch } from "@/components/ui/language-switch";
import { Screen } from "@/components/ui/screen";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PublicRooms } from "@/features/home/public-rooms";
import { useAuthErrorToast } from "@/features/home/use-auth-error";
import { UserMenu } from "@/features/home/user-menu";
import { Link, useRouter } from "@/i18n/navigation";
import { ease } from "@/lib/motion";
import { GAMES } from "@/lib/routes";

const CODE_CHARS = /[^23456789ABCDEFGHJKMNPQRSTUVWXYZ]/g;

/** "Who am I?": create a room, join one with a code, or pick a public one. */
export function WhoAmIScreen() {
  const t = useTranslations("home");
  const router = useRouter();
  const [code, setCode] = useState("");
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
            <form
              className="flex flex-col gap-2 max-sm:w-full"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 5) router.push(`/r/${code}`);
              }}
            >
              <label htmlFor="join-code" className="font-semibold text-sm">
                {t("joinLabel")}
              </label>
              <div className="flex gap-2">
                <input
                  id="join-code"
                  value={code}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="K7M2Q"
                  onChange={(e) =>
                    setCode(
                      e.target.value
                        .toUpperCase()
                        .replace(CODE_CHARS, "")
                        .slice(0, 5),
                    )
                  }
                  className="h-14 w-40 min-w-0 rounded-md border-[1.5px] border-line-strong bg-surface px-4 font-medium font-mono text-2xl tracking-[0.2em] placeholder:text-line-strong max-sm:flex-1"
                />
                <Button type="submit" size="lg" disabled={code.length !== 5}>
                  {t("join")}
                </Button>
              </div>
            </form>
          </div>
        </motion.section>

        <PublicRooms />
      </div>
    </Screen>
  );
}
