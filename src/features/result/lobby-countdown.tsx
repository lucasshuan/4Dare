"use client";

import { m } from "motion/react";
import { useTranslations } from "next-intl";
import { useRoomContext } from "@/features/data/room-context";
import { useServerClock } from "@/lib/hooks/use-server-clock";
import { dur, ease } from "@/lib/motion";

/** The podium's clock: when it runs out, everyone is taken back to the lobby. */
export function LobbyCountdown() {
  const t = useTranslations("room");
  const { view, offset } = useRoomContext();
  const now = useServerClock(offset, 250);
  if (view.deadline === null || view.stepStartsAt === null) return null;
  const total = view.deadline - view.stepStartsAt;
  const left = Math.max(0, view.deadline - Math.max(now, view.stepStartsAt));
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: dur.base, delay: 0.9, ease: ease.soft },
      }}
      role="timer"
      className="flex w-full max-w-80 flex-col gap-2 rounded-md bg-surface px-4 py-3"
    >
      <span className="font-medium text-[13px] text-ink-muted tabular-nums">
        {t("lobbyIn", { seconds: Math.ceil(left / 1000) })}
      </span>
      <span className="h-1.5 overflow-hidden rounded-pill bg-sunken">
        <span
          className="block h-full origin-left rounded-pill bg-ink transition-transform duration-300 ease-linear"
          style={{ transform: `scaleX(${total > 0 ? left / total : 0})` }}
        />
      </span>
    </m.div>
  );
}
