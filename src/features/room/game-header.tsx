"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ThemeTag, Wordmark } from "@/components/ui/screen";
import { Timer } from "@/components/ui/timer";
import { useRoomContext } from "@/features/data/room-context";
import type { Lang } from "@/game/types";

/** Header of the match screens: wordmark, theme and the step clock. */
export function GameHeader() {
  const t = useTranslations("room");
  const lang = useLocale() as Lang;
  const { view, offset } = useRoomContext();
  return (
    <header className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        <Wordmark />
        {view.theme ? (
          <ThemeTag label={t("theme")} theme={view.theme[lang]} />
        ) : null}
      </div>
      <Timer
        deadline={view.deadline}
        stepStartsAt={view.stepStartsAt}
        rechargeFrom={view.reveal?.startsAt ?? null}
        offset={offset}
      />
    </header>
  );
}

/** Page frame for the match screens. */
export function GameFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pt-4 pb-8 short:gap-4 short:pb-4 sm:px-8 sm:pt-6 sm:short:pt-4">
      <GameHeader />
      <main className="mx-auto w-full max-w-[1120px] flex-1">{children}</main>
    </div>
  );
}
