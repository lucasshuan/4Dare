"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ThemeTag } from "@/components/ui/screen";
import { Timer } from "@/components/ui/timer";
import { useRoomContext } from "@/features/data/room-context";
import { themeSetEmoji } from "@/game/theme-sets";
import type { Lang } from "@/game/types";
import { LeaveMatchButton } from "./leave-match-button";

/** Header of the match screens: theme, the screen's buttons around the step clock. No logo during a match. */
export function GameHeader({
  hideTheme = false,
  actions,
  after,
}: {
  hideTheme?: boolean;
  actions?: ReactNode;
  after?: ReactNode;
}) {
  const t = useTranslations("room");
  const lang = useLocale() as Lang;
  const { view, offset } = useRoomContext();
  return (
    <header className="flex w-full flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        {view.theme && !hideTheme ? (
          <ThemeTag
            label={t("theme")}
            theme={view.theme[lang]}
            emoji={
              view.theme.set === null ? "✍️" : themeSetEmoji(view.theme.set)
            }
          />
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <LeaveMatchButton />
        {actions}
        <Timer
          deadline={view.deadline}
          stepStartsAt={view.stepStartsAt}
          rechargeFrom={view.reveal?.startsAt ?? null}
          offset={offset}
          totalMs={view.stepMs}
          tick
        />
        {after}
      </div>
    </header>
  );
}

/** Page frame for the match screens: the whole width, with room for a sidebar on the right. */
export function GameFrame({
  children,
  hideTheme,
  actions,
  after,
  sidebar,
}: {
  children: ReactNode;
  /** The vote screen keeps the winner a surprise until it is revealed. */
  hideTheme?: boolean;
  /** Buttons left of the clock (the turn screen's give up). */
  actions?: ReactNode;
  /** Buttons right of the clock (the turn screen's history). */
  after?: ReactNode;
  /** Beside the screen, full height (the turn screen's history on wide windows). */
  sidebar?: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col gap-6 px-4 pt-4 pb-8 short:gap-4 short:pb-4 sm:px-8 sm:pt-6 sm:short:pt-4">
      <GameHeader hideTheme={hideTheme} actions={actions} after={after} />
      <div className="flex w-full flex-1 items-start">
        <main className="min-w-0 flex-1">{children}</main>
        {sidebar}
      </div>
    </div>
  );
}
